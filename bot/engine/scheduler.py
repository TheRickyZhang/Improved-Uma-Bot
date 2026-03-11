import copy
import datetime
import threading
import time

import croniter

from bot.base.task import TaskStatus as TaskStatus, TaskExecuteMode, Task
import bot.engine.executor as executor
import bot.base.log as logger

log = logger.get_logger(__name__)


class Scheduler:
    task_list: list[Task] = []
    running_task: Task = None

    active = False
    
    _executor_lock = threading.Lock()

    def add_task(self, task):
        log.info("Task added: " + task.task_id)
        with self._executor_lock:
            self.task_list.append(task)

    def start_executor_for(self, task, task_executor):
        task_executor.active = True
        executor_thread = threading.Thread(target=task_executor.start, args=([task]))
        executor_thread.start()

    def compute_next_cron(self, cron_expr):
        now = datetime.datetime.now()
        cron = croniter.croniter(cron_expr, now)
        return cron.get_next(datetime.datetime)

    def delete_task(self, task_id):
        was_running = False
        with self._executor_lock:
            for v in self.task_list:
                if v.task_id == task_id:
                    if v.task_status == TaskStatus.TASK_STATUS_RUNNING:
                        v.task_status = TaskStatus.TASK_STATUS_INTERRUPT
                        was_running = True
                    break
        if was_running:
            time.sleep(0.3)

        with self._executor_lock:
            for i, v in enumerate(self.task_list):
                if v.task_id == task_id:
                    del self.task_list[i]
                    return True
            return False

    def update_task(self, task_id, new_task):
        running_task = None
        running_new_detail = None
        with self._executor_lock:
            for task in self.task_list:
                if task.task_id != task_id:
                    continue
                task.app_name = new_task.app_name
                task.task_type = new_task.task_type
                task.task_desc = new_task.task_desc
                task.cron_job_config = new_task.cron_job_config
                if getattr(task, "task_status", None) != TaskStatus.TASK_STATUS_RUNNING:
                    task.task_execute_mode = new_task.task_execute_mode
                    if hasattr(task, "detail") and hasattr(new_task, "detail"):
                        task.detail = new_task.detail
                    return {"updated": True, "live_applied": False, "running_limited": False}
                running_task = task
                running_new_detail = getattr(new_task, "detail", None)
                if hasattr(task, "detail") and hasattr(new_task, "detail"):
                    task.detail = new_task.detail
                break
        if running_task is None:
            return {"updated": False, "live_applied": False, "running_limited": False}
        live_applied = executor.apply_live_runtime_update(running_task, running_new_detail)
        return {"updated": True, "live_applied": live_applied, "running_limited": True}

    def reset_task(self, task_id):
        with self._executor_lock:
            reset_idx = -1
            for i, v in enumerate(self.task_list):
                if v.task_id == task_id:
                    reset_idx = i
            if reset_idx != -1:
                self.task_list[reset_idx].task_status = TaskStatus.TASK_STATUS_PENDING
                self.task_list[reset_idx].end_task_reason = None
                return True
            else:
                return False

    def cleanup_completed_tasks(self):
        with self._executor_lock:
            tasks_to_remove = []
            for i, task in enumerate(self.task_list):
                if task.task_execute_mode in [TaskExecuteMode.TASK_EXECUTE_MODE_ONE_TIME,
                                               TaskExecuteMode.TASK_EXECUTE_MODE_TEAM_TRIALS]:
                    if task.task_status in [TaskStatus.TASK_STATUS_SUCCESS, 
                                            TaskStatus.TASK_STATUS_FAILED]:
                        tasks_to_remove.append(i)
            for i in reversed(tasks_to_remove):
                del self.task_list[i]

    def init(self):
        task_executor = executor.Executor()
        cleanup_counter = 0
        while True:
            try:
                if self.active:
                    cleanup_counter += 1
                    if cleanup_counter >= 60:
                        self.cleanup_completed_tasks()
                        cleanup_counter = 0
                    if cleanup_counter % 60 == 1:
                        log.info("Scheduler tick: active=%s, tasks=%d, executor_active=%s",
                                 self.active, len(self.task_list), task_executor.active)
                        for t in self.task_list:
                            log.info("  Task %s: mode=%s status=%s", t.task_id, t.task_execute_mode, t.task_status)
                    with self._executor_lock:
                        for task in self.task_list:
                            if task.task_execute_mode in [TaskExecuteMode.TASK_EXECUTE_MODE_ONE_TIME,
                                                           TaskExecuteMode.TASK_EXECUTE_MODE_TEAM_TRIALS]:
                                if task.task_status == TaskStatus.TASK_STATUS_PENDING and not task_executor.active:
                                    self.start_executor_for(task, task_executor)
                                    break
                            elif task.task_execute_mode == TaskExecuteMode.TASK_EXECUTE_MODE_FULL_AUTO:
                                if not task_executor.active:
                                    if task.task_status in [TaskStatus.TASK_STATUS_SUCCESS, TaskStatus.TASK_STATUS_FAILED, TaskStatus.TASK_STATUS_INTERRUPT]:
                                        task.task_status = TaskStatus.TASK_STATUS_PENDING
                                    if task.task_status == TaskStatus.TASK_STATUS_PENDING:
                                        self.start_executor_for(task, task_executor)
                            elif task.task_execute_mode == TaskExecuteMode.TASK_EXECUTE_MODE_CRON_JOB:
                                if task.task_status == TaskStatus.TASK_STATUS_SCHEDULED:
                                    if task.cron_job_config is not None:
                                        if task.cron_job_config.next_time is None:
                                            task.cron_job_config.next_time = self.compute_next_cron(task.cron_job_config.cron)
                                        else:
                                            if task.cron_job_config.next_time < datetime.datetime.now():
                                                self.copy_task(task, TaskExecuteMode.TASK_EXECUTE_MODE_ONE_TIME)
                                                task.cron_job_config.next_time = self.compute_next_cron(task.cron_job_config.cron)
                            elif task.task_execute_mode == TaskExecuteMode.TASK_EXECUTE_MODE_LOOP:
                                if not task_executor.active:
                                    if task.task_status in [TaskStatus.TASK_STATUS_SUCCESS, TaskStatus.TASK_STATUS_FAILED, TaskStatus.TASK_STATUS_INTERRUPT]:
                                        task.task_status = TaskStatus.TASK_STATUS_PENDING
                                    if task.task_status == TaskStatus.TASK_STATUS_PENDING:
                                        self.start_executor_for(task, task_executor)
                            else:
                                log.warning("Unknown task type: " + str(task.task_execute_mode) + ", task_id: " + str(task.task_id))

                else:
                    if task_executor.active:
                        task_executor.stop()
            except Exception as e:
                log.error("Scheduler loop error: %s", e, exc_info=True)
            time.sleep(1)

    def copy_task(self, task, to_task_execute_mode: TaskExecuteMode):
        new_task = copy.deepcopy(task)
        new_task.task_id = str(int(round(time.time() * 1000)))
        if (to_task_execute_mode == TaskExecuteMode.TASK_EXECUTE_MODE_ONE_TIME and task.task_execute_mode ==
                TaskExecuteMode.TASK_EXECUTE_MODE_CRON_JOB):
            new_task.task_id = "CRONJOB_" + new_task.task_id
            new_task.cron_job_config = None
        new_task.task_execute_mode = to_task_execute_mode
        if new_task.task_execute_mode == TaskExecuteMode.TASK_EXECUTE_MODE_ONE_TIME:
            new_task.task_status = TaskStatus.TASK_STATUS_PENDING
        self.task_list.append(new_task)

    def stop(self):
        self.active = False

    def start(self):
        self.active = True

    def get_task_list(self):
        return self.task_list


scheduler = Scheduler()

