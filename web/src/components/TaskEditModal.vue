<template>
  <div id="create-task-list-modal" class="modal fade" data-backdrop="static" data-keyboard="false">
    <div class="modal-dialog modal-dialog-centered modal-xl">
      <div class="modal-content" :class="{ 'dimmed': showAoharuConfigModal || showSupportCardSelectModal }">
        <div class="modal-header d-flex align-items-center justify-content-between">
          <div>
            <h5 class="mb-0">{{ modalTitle }}</h5>
            <small v-if="isEditMode" class="text-muted">Task ID: {{ editingTaskId || '-' }}</small>
            <small v-if="isEditingRunningTask" class="d-block text-muted">Running task detected: save applies safe runtime fields live.</small>
          </div>
          <div class="header-actions">
            <button type="button" class="btn btn-sm btn--outline" :disabled="isSavingTask" @click="cancelTask">Cancel</button>
            <button type="button" class="btn btn-sm btn--primary" :disabled="isSavingTask" @click="addTask">{{ submitLabel }}</button>
          </div>
        </div>
        <div class="modal-body modal-body--split" ref="scrollPane">
          <div class="side-nav">
            <div class="side-nav-title">Sections</div>
            <ul class="side-nav-list">
              <li v-for="s in sectionList" :key="s.id">
                <a href="#" :class="{ active: activeSection === s.id }" @click.prevent="scrollToSection(s.id)">{{ s.label }}</a>
              </li>
            </ul>
          </div>
          <form class="content-pane">
            <div class="category-card" id="category-general">
              <div class="category-title">General</div>
                            <div class="form-group">
                <label for="selectExecuteMode">Execution Mode</label>
                <select v-model.number="selectedExecuteMode" class="form-control" id="selectExecuteMode" :disabled="isEditingRunningTask">
                  <option :value="1">Single Execution</option>
                  <option :value="3">Loop until canceled</option>
                  <option :value="4">Team Trials</option>
                  <option :value="5">Full Auto (Career + Team Trials Loop)</option>
                </select>
                <small v-if="isEditingRunningTask" class="form-text text-muted">Execution mode for a currently running task is locked until the task stops.</small>
                <small v-if="isEditingRunningTask" class="form-text text-muted">Safe scoring/runtime settings are live-applied on save; mode and structural settings apply on next run.</small>
              </div>
              <div class="row">
                <div class="col">
                  <div class="form-group">
                    <label for="selectScenario">Scenario Selection</label>
                    <select v-model.number="selectedScenario" class="form-control" id="selectScenario">
                      <option :value="1">URA</option>
                      <option :value="2">Aoharu Cup</option>
<option :value="3">MANT (in progress)</option>
                    </select>
                  </div>
                </div>
                <div class="col">
                  <div class="form-group">
                    <label for="selectUmamusume">Uma Musume Selection</label>
                    <select disabled class="form-control" id="selectUmamusume">
                      <option value=1>Use Last Selection</option>
                    </select>
                  </div>
                </div>
                <div class="col">
                  <div class="form-group">
                    <label for="selectAutoRecoverTP">Auto-recover when TP is low</label>
                    <select v-model="recoverTP" class="form-control" id="selectAutoRecoverTP">
                      <option :value="0">Don't auto-recover</option>
                      <option :value="1">When TP low, use TP (if available)</option>
                      <option :value="2">When TP low, use TP or carrots</option>
                    </select>
                  </div>
                </div>
                </div>
                <div class="row">
                <div class="col-3">
                <div class="form-group">
                <label class="d-block mb-1">Use Last Parents</label>
                <div class="token-toggle" role="group" aria-label="Use Last Parents">
                <button type="button" class="token" :class="{ active: useLastParents }" @click="useLastParents = true">Yes</button>
                <button type="button" class="token" :class="{ active: !useLastParents }" @click="useLastParents = false">No</button>
                </div>
                </div>
                </div>
                </div>
                <div class="row" v-if="selectedScenario === 1">
                <div class="col-4">
                  <div class="form-group">
                    <span class="btn auto-btn" style="width:100%" v-on:click="openUraConfigModal">URA Configuration</span>
                  </div>
                </div>
              </div>
              <div class="row" v-if="selectedScenario === 2">
                <div class="col-4">
                  <div class="form-group">
                    <span class="btn auto-btn" style="width:100%" v-on:click="openAoharuConfigModal">Aoharu Cup Configuration</span>
                  </div>
                </div>
              </div>
              <div class="row" v-if="selectedScenario === 3">
                <div class="col-12">
                  <div class="form-group">
                    <label>Items Selection <small style="color:var(--muted-2);font-weight:400">(I suggest you watch a guide before touching this)</small></label>
                    <div class="section-card p-3">
                      <div class="mant-controls mb-2">
                        <button type="button" class="btn btn-sm btn--outline me-1" @click="mantAddTier">+ Add Tier</button>
                        <button type="button" class="btn btn-sm btn--outline me-1" @click="mantRemoveTier" :disabled="!mantCanRemoveTier">- Remove Tier</button>
                      </div>
                      <div class="mant-tierlist">
                        <div v-for="t in mantTierCount" :key="'tier-' + t"
                             class="mant-tier-row"
                             :class="{ 'mant-tier-dragover': mantDragOverTier === t }"
                             @dragover.prevent="mantDragOverTier = t"
                             @dragleave="mantDragOverTier = null"
                             @drop.prevent="mantDropOnTier(t, $event)">
                          <div class="mant-tier-label mant-tier-label--prio">Tier {{ t }}</div>
                          <div class="mant-tier-items">
                            <div v-for="id in mantGetItemsInTier(t)" :key="id"
                                 class="mant-item-cell"
                                 draggable="true"
                                 @dragstart="mantDragStart(id, $event)"
                                 @dragend="mantDragEnd">
                              <img :src="getMantItemImg(id)" :alt="id" class="mant-item-img" />
                            </div>
                            <div v-if="mantGetItemsInTier(t).length === 0" class="mant-tier-empty">empty</div>
                          </div>
                        </div>
                      </div>
                      <div class="mant-thresholds mt-3">
                        <label>Use when percentile is (whistle above rest below)</label>
                        <div class="mant-threshold-group">
                          <div class="mant-threshold-row">
                            <img :src="getMantItemImg('shuffle')" class="mant-threshold-img" />
                            <div class="mant-threshold-controls">
                              <span class="mant-threshold-label">Whistle</span>
                              <div class="mant-threshold-slider-row">
                                <input type="range" class="hint-slider" v-model.number="mantWhistleThreshold" min="0" max="100" />
                                <span class="mant-threshold-val">{{ mantWhistleThreshold }}</span>
                              </div>
                            </div>
                            <div class="token-toggle ms-2" role="group">
                              <button type="button" class="token" :class="{ active: mantWhistleFocusSummer }" @click="mantWhistleFocusSummer = true">Focus Summer</button>
                              <button type="button" class="token" :class="{ active: !mantWhistleFocusSummer }" @click="mantWhistleFocusSummer = false">Off</button>
                            </div>
                          </div>
                          <div class="mant-threshold-row">
                            <img :src="getMantItemImg('megasmall')" class="mant-threshold-img" />
                            <div class="mant-threshold-controls">
                              <span class="mant-threshold-label">Mega Small</span>
                              <div class="mant-threshold-slider-row">
                                <input type="range" class="hint-slider" v-model.number="mantMegaSmallThreshold" min="0" max="100" />
                                <span class="mant-threshold-val">{{ mantMegaSmallThreshold }}</span>
                              </div>
                            </div>
                          </div>
                          <div class="mant-threshold-row">
                            <img :src="getMantItemImg('megamedium')" class="mant-threshold-img" />
                            <div class="mant-threshold-controls">
                              <span class="mant-threshold-label">Mega Medium</span>
                              <div class="mant-threshold-slider-row">
                                <input type="range" class="hint-slider" v-model.number="mantMegaMediumThreshold" min="0" max="100" />
                                <span class="mant-threshold-val">{{ mantMegaMediumThreshold }}</span>
                              </div>
                            </div>
                          </div>
                          <div class="mant-threshold-row">
                            <img :src="getMantItemImg('megalarge')" class="mant-threshold-img" />
                            <div class="mant-threshold-controls">
                              <span class="mant-threshold-label">Mega Large</span>
                              <div class="mant-threshold-slider-row">
                                <input type="range" class="hint-slider" v-model.number="mantMegaLargeThreshold" min="0" max="100" />
                                <span class="mant-threshold-val">{{ mantMegaLargeThreshold }}</span>
                              </div>
                            </div>
                          </div>
                          <div class="mant-threshold-row">
                            <div class="mant-threshold-img-grid">
                              <img :src="getMantItemImg('speedweights')" />
                              <img :src="getMantItemImg('staminaweights')" />
                              <img :src="getMantItemImg('powerweights')" />
                              <img :src="getMantItemImg('gutsweights')" />
                            </div>
                            <div class="mant-threshold-controls">
                              <span class="mant-threshold-label">Training Weights</span>
                              <div class="mant-threshold-slider-row">
                                <input type="range" class="hint-slider" v-model.number="mantTrainingWeightsThreshold" min="0" max="100" />
                                <span class="mant-threshold-val">{{ mantTrainingWeightsThreshold }}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div class="category-card" id="category-decision-docs">
              <div class="category-title">Decision Documentation</div>
              <div class="decision-docs">
                <p class="decision-docs-lead">
                  Training choice is deterministic scoring, not black-box policy inference.
                </p>
                <pre class="decision-formula">final_score =
(base + friendship + npc + stats + hint + energy + scenario_additive)
* pal_multiplier
* failure_multiplier
* scenario_multiplier
* stat_cap_multiplier
* extra_weight_multiplier</pre>

                <details class="advanced-block" open>
                  <summary>How Scores Are Built</summary>
                  <div class="advanced-block-body">
                    <ul class="decision-list">
                      <li><strong>Friendship:</strong> <code>score_value[period][0]</code>; green uses <code>friendship_green_discount</code>.</li>
                      <li><strong>NPC:</strong> <code>npc_weight[period]</code> per NPC in the facility.</li>
                      <li><strong>Stats:</strong> detected stat gains multiplied by <code>stat_value_multiplier</code>.</li>
                      <li><strong>Hint:</strong> <code>score_value[period][2]</code>, optionally boosted by hint-boost settings.</li>
                      <li><strong>Energy:</strong> detected energy delta multiplied by <code>score_value[period][1]</code>.</li>
                      <li><strong>Scenario:</strong> scenario-specific additive/multipliers (Aoharu special/spirit/wit-special).</li>
                    </ul>
                  </div>
                </details>

                <details class="advanced-block" open>
                  <summary>Multipliers and Penalties</summary>
                  <div class="advanced-block-body">
                    <ul class="decision-list">
                      <li><strong>PAL:</strong> applies <code>pal_card_multiplier</code> when PAL card is present.</li>
                      <li><strong>Failure compensation:</strong> if enabled, <code>max(0, 1 - failure_rate / failure_rate_divisor)</code>.</li>
                      <li><strong>Stat cap:</strong> uses <code>stat_cap_penalties</code> against current stat vs target stat.</li>
                      <li><strong>Extra weight:</strong> per-facility multiplier from <code>extra_weight</code> (summer row in camp).</li>
                    </ul>
                  </div>
                </details>

                <details class="advanced-block" open>
                  <summary>Operation Priority and Tie Rules</summary>
                  <div class="advanced-block-body">
                    <ul class="decision-list">
                      <li><strong>Pre-check override:</strong> Trip/Rest/Medic/Race can override training pick.</li>
                      <li><strong>Period buckets:</strong> Junior 1-24, Classic 25-48, Senior early 49-60, Senior late 61-72, Finale 73+.</li>
                      <li><strong>Blocked training:</strong> if only one facility is available, it is forced.</li>
                      <li><strong>Tie-break:</strong> lowest index wins (Speed, Stamina, Power, Guts, Wit).</li>
                      <li><strong>Summer conserve window:</strong> threshold uses <code>summer_score_threshold</code>.</li>
                      <li><strong>Wit race search:</strong> low max score + high energy can trigger race search via <code>wit_race_search_threshold</code>.</li>
                    </ul>
                  </div>
                </details>

                <details class="advanced-block">
                  <summary>Where These Weights Come From</summary>
                  <div class="advanced-block-body">
                    <ul class="decision-list">
                      <li><strong>Primary source:</strong> fields in this modal and loaded preset values.</li>
                      <li><strong>Backend binding:</strong> values are saved into task attachment and copied into runtime context.</li>
                      <li><strong>Fallback defaults:</strong> used if a field is missing; defaults are defined in scoring constants.</li>
                    </ul>
                    <p class="decision-note">
                      For code-level details: <code>module/umamusume/script/cultivate_task/training_select.py</code>,
                      <code>module/umamusume/script/cultivate_task/ai.py</code>,
                      <code>module/umamusume/constants/scoring_constants.py</code>.
                    </p>
                  </div>
                </details>
              </div>
            </div>
            <!-- Limited Time Module: Fujikiseki Show Mode -->
            <!-- <div class="row">
              <div class="col-3">
                <div class="form-group">
                  <label>⏰ Fujikiseki Show Mode</label>
                  <select v-model="fujikisekiShowMode" class="form-control">
                    <option :value=true>Yes</option>
                    <option :value=false>No</option>
                  </select>
                </div>
              </div>
              <div class="col-2">
                <div class="form-group">
                  <label :style="{ color: fujikisekiShowMode ? '' : 'lightgrey' }">Select Difficulty</label>
                  <select v-model="fujikisekiShowDifficulty" class="form-control" :disabled="!fujikisekiShowMode">
                    <option v-for="n in 5" :key="n" :value="n">{{ n }}</option>
                  </select>
                </div>
              </div>
            </div> -->
            <div class="category-card" id="category-preset">
              <div class="category-title">Preset &amp; Support Card</div>
              <div class="row">
                <div class="col-8">
                  <div class="form-group">
                    <label for="race-select">Use Preset</label>
                    <div class="input-group input-group-sm">
                      <select v-model="presetsUse" class="form-control" id="use_presets">
                        <option v-for="set in cultivatePresets" :value="set">{{ set.name }}</option>
                      </select>
                      <div class="input-group-append">
                        <button type="button" class="btn btn-sm auto-btn" @click="applyPresetRace">Apply</button>
                      </div>
                    </div>
                  </div>
                </div>
                <div class="col-4">
                  <div class="form-group preset-actions">
                    <label>Save Preset</label>
                    <div class="dropdown preset-save-group">
                      <button type="button" class="btn btn-sm btn-outline-primary dropdown-toggle align-self-stretch"
                        :disabled="isSavingPreset" @click="togglePresetMenu">{{ isSavingPreset ? 'Saving...' : 'Save Preset' }}</button>
                      <div class="dropdown-menu show" v-if="showPresetMenu">
                        <a href="#" class="dropdown-item" @click.prevent="selectPresetAction('add')">Add new preset</a>
                        <a href="#" class="dropdown-item" @click.prevent="selectPresetAction('overwrite')">Overwrite
                          preset</a>
                        <a href="#" class="dropdown-item text-danger"
                          @click.prevent="selectPresetAction('delete')">Delete saved preset</a>
                      </div>
                    </div>
                    <div v-if="presetAction === 'add'" class="mt-1">
                      <div class="input-group input-group-sm">
                        <input v-model="presetNameEdit" type="text" class="form-control" placeholder="Preset Name">
                        <div class="input-group-append">
                          <button class="btn btn-sm auto-btn" type="button" :disabled="isSavingPreset" @click="confirmAddPreset">Save</button>
                        </div>
                      </div>
                    </div>
                    <div v-if="presetAction === 'overwrite'" class="mt-1">
                      <div class="input-group input-group-sm">
                        <select v-model="overwritePresetName" class="form-control">
                          <option v-for="set in cultivatePresets.filter(p => p.name !== 'Default')" :key="set.name"
                            :value="set.name">{{ set.name }}</option>
                        </select>
                        <div class="input-group-append">
                          <button class="btn btn-sm auto-btn" type="button"
                            :disabled="isSavingPreset" @click="confirmOverwritePreset">Overwrite</button>
                        </div>
                      </div>
                    </div>
                    <div v-if="presetAction === 'delete'" class="mt-1">
                      <div class="input-group input-group-sm">
                        <select v-model="deletePresetName" class="form-control">
                          <option v-for="set in cultivatePresets.filter(p => p.name !== 'Default')" :key="set.name"
                            :value="set.name">{{ set.name }}</option>
                        </select>
                        <div class="input-group-append">
                          <button class="btn btn-danger btn-sm" type="button"
                            :disabled="isSavingPreset" @click="confirmDeletePreset">Delete</button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div class="row">
                <div class="col-12">
                  <div class="form-group">
                    <label>Share Preset</label>
                    <div class="input-group input-group-sm">
                      <input v-model="sharePresetText" type="text" class="form-control" placeholder="Paste preset code here or click Export">
                      <div class="input-group-append">
                        <button class="btn btn-sm btn-outline-primary" type="button" @click="exportPreset">Export</button>
                        <button class="btn btn-sm auto-btn" type="button" @click="importPreset">Import</button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div class="row">
                <div class="col-6">
                  <div class="form-group">
                    <label>Friend Support Card Selection</label>
                    <div class="input-group input-group-sm">
                      <input type="text" class="form-control" :value="renderSupportCardText(selectedSupportCard)"
                        readonly id="selectedSupportCard">
                      <div class="input-group-append">
                        <button type="button" class="btn btn-sm auto-btn"
                          @click="openSupportCardSelectModal">Change</button>
                      </div>
                    </div>
                  </div>
                </div>
                <div class="col-3">
                  <div class="form-group">
                    <label for="selectSupportCardLevel">Support Card Level (≥)</label>
                    <input v-model="supportCardLevel" type="number" class="form-control" id="selectSupportCardLevel"
                      placeholder="">
                  </div>
                </div>
              </div>
            </div>
            <div class="category-card" id="category-career">
              <div class="category-title">Career Settings</div>
              <div class="row">
                <div class="col-3">
                  <div class="form-group">
                    <label for="inputClockUseLimit">Clock Usage Limit</label>
                    <input v-model="clockUseLimit" type="number" class="form-control" id="inputClockUseLimit"
                      placeholder="">
                  </div>
                </div>
                <div class="col-3">
                  <div class="form-group">
                    <label for="inputRestTreshold">Rest Threshold</label>
                    <input v-model="restTreshold" type="number" min="20" max="80" class="form-control" id="inputRestTreshold" placeholder="">
                  </div>
                </div>
                <div class="col-3">
                  <div class="form-group">
                    <label class="d-block mb-1">Compensate for failure</label>
                    <div class="token-toggle" role="group" aria-label="Compensate for failure">
                      <button type="button" class="token" :class="{ active: compensateFailure }" @click="compensateFailure = true">Yes</button>
                      <button type="button" class="token" :class="{ active: !compensateFailure }" @click="compensateFailure = false">No</button>
                    </div>
                  </div>
                </div>
                <div class="col-3" v-if="compensateFailure">
                  <div class="form-group">
                    <label for="inputFailureRateDivisor">Failure Rate Divisor</label>
                    <input v-model.number="failureRateDivisor" type="number" min="10" max="200" step="5"
                         class="form-control" id="inputFailureRateDivisor">
                    <small class="form-text text-muted">Higher = less penalty (default 50: 25% fail → 0.5x score)</small>
                  </div>
                </div>
              </div>
                            <div class="form-group Cure-asap">
                <label for="cure-asap-input">Cure These Conditions As Soon As Possible (Separate by comma)</label>
                <textarea v-model="cureAsapConditions" class="form-control" id="cure-asap-input"
                  spellcheck="false"></textarea>
              </div>
              <div class="form-group">
                <div>Target Attributes (Try adjust your deck/slightly tweaking training weight [0.1 to -0.1] instead of adjusting this)</div>
              </div>
              <div class="row">
                <div class="col">
                  <div class="form-group">
                    <label for="speed-value-input">Speed</label>
                    <div class="input-group input-group-sm">
                      <input type="number" v-model="expectSpeedValue" class="form-control" id="speed-value-input">
                      <div class="input-group-append"><span class="input-group-text">pt</span></div>
                    </div>
                  </div>
                </div>
                <div class="col">
                  <div class="form-group">
                    <label for="stamina-value-input">Stamina</label>
                    <div class="input-group input-group-sm">
                      <input type="number" v-model="expectStaminaValue" class="form-control" id="stamina-value-input">
                      <div class="input-group-append"><span class="input-group-text">pt</span></div>
                    </div>
                  </div>
                </div>
                <div class="col">
                  <div class="form-group">
                    <label for="power-value-input">Power</label>
                    <div class="input-group input-group-sm">
                      <input type="number" v-model="expectPowerValue" class="form-control" id="power-value-input">
                      <div class="input-group-append"><span class="input-group-text">pt</span></div>
                    </div>
                  </div>
                </div>
                <div class="col">
                  <div class="form-group">
                    <label for="will-value-input">Guts</label>
                    <div class="input-group input-group-sm">
                      <input type="number" v-model="expectWillValue" class="form-control" id="will-value-input">
                      <div class="input-group-append"><span class="input-group-text">pt</span></div>
                    </div>
                  </div>
                </div>
                <div class="col">
                  <div class="form-group">
                    <label for="intelligence-value-input">Wit</label>
                    <div class="input-group input-group-sm">
                      <input type="number" v-model="expectIntelligenceValue" class="form-control"
                        id="intelligence-value-input">
                      <div class="input-group-append"><span class="input-group-text">pt</span></div>
                    </div>
                  </div>
                </div>
              </div>
              <div class="form-group">
                <div>Desire Mood (Customize the desire Mood per year)</div>
              </div>
              <div class="row">
                <div class="col">
                  <div class="form-group">
                    <label for="motivation-year1">Year 1</label>
                    <div class="input-group input-group-sm">
                      <select v-model="motivationThresholdYear1" class="form-control" id="motivation-year1">
                        <option :value=1>Awful</option>
                        <option :value=2>Bad</option>
                        <option :value=3>Normal</option>
                        <option :value=4>Good</option>
                        <option :value=5>Great</option>
                      </select>
                    </div>
                  </div>
                </div>
                <div class="col">
                  <div class="form-group">
                    <label for="motivation-year2">Year 2</label>
                    <div class="input-group input-group-sm">
                      <select v-model="motivationThresholdYear2" class="form-control" id="motivation-year2">
                        <option :value=1>Awful</option>
                        <option :value=2>Bad</option>
                        <option :value=3>Normal</option>
                        <option :value=4>Good</option>
                        <option :value=5>Great</option>
                      </select>
                    </div>
                  </div>
                </div>
                <div class="col">
                  <div class="form-group">
                    <label for="motivation-year3">Year 3</label>
                    <div class="input-group input-group-sm">
                      <select v-model="motivationThresholdYear3" class="form-control" id="motivation-year3">
                        <option :value=1>Awful</option>
                        <option :value=2>Bad</option>
                        <option :value=3>Normal</option>
                        <option :value=4>Good</option>
                        <option :value=5>Great</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
              <div class="row">
                <div class="col-6">
                  <div class="form-group">
                    <label class="d-block mb-1">I am using a pal support card (Limit of 1)</label>
                    <div class="token-toggle" role="group" aria-label="Prioritize Recreation">
                      <button type="button" class="token" :class="{ active: prioritizeRecreation }" @click="prioritizeRecreation = true">Yes</button>
                      <button type="button" class="token" :class="{ active: !prioritizeRecreation }" @click="prioritizeRecreation = false">No</button>
                    </div>
                  </div>
                </div>
              </div>
              <div v-if="prioritizeRecreation" class="pal-config-section mt-3 mb-3">
                <div class="pal-config-header" @click="togglePalConfigPanel">
                  <div class="pal-config-title">
                    <i class="fas fa-users"></i>
                    Pal outing upper threshold (will go outing when all values are below what is set) btw great mood is 5 and awful is 1 (normal is 3)
                  </div>
                  <div class="pal-config-toggle">
                    <span class="toggle-text">{{ showPalConfigPanel ? 'Hide' : 'Show' }}</span>
                    <i class="fas" :class="showPalConfigPanel ? 'fa-chevron-up' : 'fa-chevron-down'"></i>
                  </div>
                </div>
                <div v-if="showPalConfigPanel" class="pal-config-content">
                  <div v-for="(palData, palName) in palCardStore" :key="palName" class="pal-card-item">
                    <div class="pal-card-header">
                      <div class="pal-card-checkbox">
                        <button type="button" class="pal-checkbox" :class="{ checked: palSelected === palName }" @click="togglePalCardSelection(palName)">
                          <i class="fas fa-check" v-if="palSelected === palName"></i>
                        </button>
                      </div>
                      <div class="pal-card-name">{{ palName }}</div>
                    </div>
                    <div v-if="palSelected === palName" class="pal-stages-list">
                      <div v-for="(stageData, stageIdx) in palData" :key="stageIdx" class="pal-stage-row">
                        <div class="stage-label">Stage {{ stageIdx + 1 }}</div>
                        <div class="stage-inputs">
                          <div class="input-group input-group-sm">
                            <span class="input-group-text">Mood</span>
                            <input type="number" class="form-control" v-model.number="palCardStore[palName][stageIdx][0]" min="0" max="5">
                          </div>
                          <div class="input-group input-group-sm">
                            <span class="input-group-text">Energy</span>
                            <input type="number" class="form-control" v-model.number="palCardStore[palName][stageIdx][1]" min="0" max="100">
                          </div>
                          <div class="input-group input-group-sm">
                            <span class="input-group-text">Score</span>
                            <input type="number" step="0.01" class="form-control" v-model.number="palCardStore[palName][stageIdx][2]" min="0" max="1">
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                

                <div class="pal-card-config-section mt-3">
                  <div class="pal-card-config-header">
                    <i class="fas fa-star"></i>
                    Pal Card Config
                  </div>
                  <div class="pal-card-config-content">
                    <div class="config-row">
                      <label class="config-label">Pal Friendship Score</label>
                      <div class="row">
                        <div class="col-4">
                          <div class="form-group">
                            <label for="pal-blue-score">Blue</label>
                            <input type="number" step="0.1" v-model.number="palFriendshipScore[0]" class="form-control form-control-sm" id="pal-blue-score" min="0" max="50">
                          </div>
                        </div>
                        <div class="col-4">
                          <div class="form-group">
                            <label for="pal-green-score">Green</label>
                            <input type="number" step="0.1" v-model.number="palFriendshipScore[1]" class="form-control form-control-sm" id="pal-green-score" min="0" max="50">
                          </div>
                        </div>
                        <div class="col-4">
                          <div class="form-group">
                            <label for="pal-maxed-score">Maxed</label>
                            <input type="number" step="0.1" v-model.number="palFriendshipScore[2]" class="form-control form-control-sm" id="pal-maxed-score" min="0" max="50">
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div class="config-row mt-3">
                      <label class="config-label">Pal Card Multi (0-100%)</label>
                      <div class="row">
                        <div class="col-4">
                          <div class="form-group">
                            <div class="input-group input-group-sm">
                              <input type="number" step="0.1" v-model.number="palCardMultiplier" class="form-control" id="pal-card-multi" min="0" max="100">
                              <span class="input-group-text">{{ palCardMultiplier.toFixed(1) }}%</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div class="hint-boost-section mt-3 mb-3">
                <div class="hint-boost-header" @click="showHintBoostPanel = !showHintBoostPanel">
                  <div class="hint-boost-title">
                    <i class="fas fa-bolt"></i>
                    Hint Score Boost
                  </div>
                  <div class="hint-boost-toggle">
                    <span v-if="hintBoostCharacters.length" class="hint-boost-badge">{{ hintBoostCharacters.length }} selected · {{ hintBoostMultiplier }}%</span>
                    <span class="toggle-text">{{ showHintBoostPanel ? 'Hide' : 'Show' }}</span>
                    <i class="fas" :class="showHintBoostPanel ? 'fa-chevron-up' : 'fa-chevron-down'"></i>
                  </div>
                </div>
                <div v-if="showHintBoostPanel" class="hint-boost-content">
                  <p style="font-size: 0.85em; color: var(--muted); margin-bottom: 10px;">
                    Multiplies the hint scores of these characters by x%
                  </p>
                  <div class="row align-items-center mb-3">
                    <div class="col-md-4 col-6">
                      <label class="mb-1">Hint Multiplier</label>
                      <div class="hint-slider-group">
                        <input type="range" class="hint-slider" v-model.number="hintBoostMultiplier" min="100" max="1000" step="10">
                        <div class="input-group input-group-sm" style="width:110px;">
                          <input type="number" class="form-control" v-model.number="hintBoostMultiplier" min="100" max="1000" step="10">
                          <span class="input-group-text">%</span>
                        </div>
                      </div>
                    </div>
                    <div class="col-md-4 col-6">
                      <label class="mb-1">Search</label>
                      <input type="text" class="form-control form-control-sm" v-model="hintBoostSearch" placeholder="Search characters...">
                    </div>
                    <div class="col-md-4 col-6 d-flex align-items-end" style="padding-top: 4px;">
                      <button type="button" class="btn btn-sm btn-outline-secondary" @click="hintBoostCharacters = []">Clear All</button>
                    </div>
                  </div>
                  <div v-if="hintBoostCharacters.length" class="hint-boost-selected mb-2">
                    <div v-for="name in hintBoostCharacters" :key="'sel-'+name" class="hint-chip selected" @click="toggleHintBoostCharacter(name)">
                      <img :src="'/training-icon/' + encodeURIComponent(name)" class="hint-chip-icon" loading="lazy" @error="handleImageLoadError">
                      <span>{{ name }}</span>
                      <i class="fas fa-times hint-chip-remove"></i>
                    </div>
                  </div>
                  <div class="hint-char-grid">
                    <div v-for="name in filteredHintCharacters" :key="name"
                      class="hint-char-item" :class="{ selected: hintBoostCharacters.includes(name) }"
                      @click="toggleHintBoostCharacter(name)">
                      <img :src="'/training-icon/' + encodeURIComponent(name)" class="hint-char-icon" loading="lazy" @error="handleImageLoadError">
                      <span class="hint-char-name">{{ name }}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div class="hint-boost-section mt-3 mb-3" v-for="(fsg, fsgIdx) in friendshipScoreGroups" :key="'fsg-'+fsgIdx">
                <div class="hint-boost-header" @click="fsg.expanded = !fsg.expanded">
                  <div class="hint-boost-title">
                    <i class="fas fa-heart"></i>
                    Friendship score{{ fsgIdx > 0 ? ' ' + (fsgIdx + 1) : '' }}
                  </div>
                  <div class="hint-boost-toggle">
                    <span v-if="fsg.characters.length" class="hint-boost-badge">{{ fsg.characters.length }} selected · {{ fsg.multiplier }}%</span>
                    <span class="toggle-text">{{ fsg.expanded ? 'Hide' : 'Show' }}</span>
                    <i class="fas" :class="fsg.expanded ? 'fa-chevron-up' : 'fa-chevron-down'"></i>
                  </div>
                </div>
                <div v-if="fsg.expanded" class="hint-boost-content">
                  <p style="font-size: 0.85em; color: var(--muted); margin-bottom: 10px;">
                    Multiplies the blue and green friendship scores of selected characters by this %
                  </p>
                  <div class="row align-items-center mb-3">
                    <div class="col-md-4 col-6">
                      <label class="mb-1">Friendship Multiplier</label>
                      <div class="hint-slider-group">
                        <input type="range" class="hint-slider" v-model.number="fsg.multiplier" min="0" max="200" step="5">
                        <div class="input-group input-group-sm" style="width:110px;">
                          <input type="number" class="form-control" v-model.number="fsg.multiplier" min="0" max="200" step="5">
                          <span class="input-group-text">%</span>
                        </div>
                      </div>
                    </div>
                    <div class="col-md-4 col-6">
                      <label class="mb-1">Search</label>
                      <input type="text" class="form-control form-control-sm" v-model="fsg.search" placeholder="Search characters...">
                    </div>
                    <div class="col-md-4 col-6 d-flex align-items-end" style="padding-top: 4px;">
                      <button type="button" class="btn btn-sm btn-outline-secondary" @click="fsg.characters = []">Clear All</button>

                    </div>
                  </div>
                  <div v-if="fsg.characters.length" class="hint-boost-selected mb-2">
                    <div v-for="name in fsg.characters" :key="'fsg-sel-'+fsgIdx+'-'+name" class="hint-chip selected" @click="toggleFsgCharacter(fsgIdx, name)">
                      <img :src="'/training-icon/' + encodeURIComponent(name)" class="hint-chip-icon" loading="lazy" @error="handleImageLoadError">
                      <span>{{ name }}</span>
                      <i class="fas fa-times hint-chip-remove"></i>
                    </div>
                  </div>
                  <div class="hint-char-grid">
                    <div v-for="name in filteredFsgCharacters(fsgIdx)" :key="'fsg-'+fsgIdx+'-'+name"
                      class="hint-char-item" :class="{ selected: fsg.characters.includes(name) }"
                      @click="toggleFsgCharacter(fsgIdx, name)">
                      <img :src="'/training-icon/' + encodeURIComponent(name)" class="hint-char-icon" loading="lazy" @error="handleImageLoadError">
                      <span class="hint-char-name">{{ name }}</span>
                    </div>
                  </div>
                </div>
              </div>
              <div class="mb-3">
                <button type="button" class="btn btn-sm btn-outline-secondary" @click="friendshipScoreGroups.push({ characters: [], multiplier: 100, search: '', expanded: false })">
                  <i class="fas fa-plus"></i> Add new folder
                </button>
                <button v-if="friendshipScoreGroups.length > 1" type="button" class="btn btn-sm btn-outline-danger ms-2" @click="friendshipScoreGroups.pop()">
                  <i class="fas fa-trash"></i> Delete folder
                </button>
              </div>

              <div>
                <div class="form-group">
                  <div class="advanced-options-header" @click="switchAdvanceOption">
                    <div class="advanced-options-title">
                      <i class="fas fa-cogs"></i>
                      Advanced Options
                    </div>
                    <div class="advanced-options-toggle">
                      <span class="toggle-text">{{ showAdvanceOption ? 'Hide' : 'Show' }}</span>
                      <i class="fas" :class="showAdvanceOption ? 'fa-chevron-up' : 'fa-chevron-down'"></i>
                    </div>
                  </div>
                </div>
              </div>
              <div v-if="showAdvanceOption" class="advanced-options-content">
                <details class="advanced-block" open>
                  <summary>Training Multipliers</summary>
                  <div class="advanced-block-body">
                <div class="form-group">
                  <div style="color: var(--accent);">Extra Weights For Training</div>
                </div>
                <p>Applies a flat multiplier to the training score (-100% To +100%)</p>
                <p>-1 would make it skip the training</p>
                <div style="margin-bottom: 10px; color: var(--accent);">Year 1</div>
                <div class="row">
                  <div v-for="(v, i) in extraWeight1" :key="i" class="col-md-2 col-6">
                    <div class="form-group mb-1"><small>{{ ['Speed','Stamina','Power','Guts','Wit'][i] }}</small></div>
                    <input type="number" v-model="extraWeight1[i]" class="form-control"
                      @input="onExtraWeightInput(extraWeight1, i)" id="speed-value-input">
                  </div>
                </div>
                <div style="margin-bottom: 10px; color: var(--accent);">Year 2</div>
                <div class="row">
                  <div v-for="(v, i) in extraWeight2" :key="i" class="col-md-2 col-6">
                    <div class="form-group mb-1"><small>{{ ['Speed','Stamina','Power','Guts','Wit'][i] }}</small></div>
                    <input type="number" v-model="extraWeight2[i]" class="form-control"
                      @input="onExtraWeightInput(extraWeight2, i)" id="speed-value-input">
                  </div>
                </div>
                <div style="margin-bottom: 10px; color: var(--accent);">Year 3</div>
                <div class="row">
                  <div v-for="(v, i) in extraWeight3" :key="i" class="col-md-2 col-6">
                    <div class="form-group mb-1"><small>{{ ['Speed','Stamina','Power','Guts','Wit'][i] }}</small></div>
                    <input type="number" v-model="extraWeight3[i]" class="form-control"
                      @input="onExtraWeightInput(extraWeight3, i)" id="speed-value-input">
                  </div>
                </div>
                <div style="margin-bottom: 10px; color: var(--accent);">Summer Weights (overrides during Summer Camps)</div>
                <div class="row">
                  <div v-for="(v, i) in extraWeightSummer" :key="i" class="col-md-2 col-6">
                    <div class="form-group mb-1"><small>{{ ['Speed','Stamina','Power','Guts','Wit'][i] }}</small></div>
                    <input type="number" v-model="extraWeightSummer[i]" class="form-control"
                      @input="onExtraWeightInput(extraWeightSummer, i)" id="speed-value-input">
                  </div>
                </div>
                <hr style="border-color: var(--accent); opacity: 0.5; margin: 12px 0;">
                <div class="form-group" style="margin-top: 16px;">
                  <div style="color: var(--accent);">Base Score</div>
                </div>
                <p>Starting score value before adding bonuses (applied before multipliers)</p>
                <div class="row">
                  <div v-for="(v, i) in baseScore" :key="i" class="col-md-2 col-6">
                    <div class="form-group mb-1"><small>{{ ['Speed','Stamina','Power','Guts','Wit'][i] }}</small></div>
                    <input type="number" step="1" v-model.number="baseScore[i]" class="form-control">
                  </div>
                </div>
                  </div>
                </details>
                <details class="advanced-block" open>
                  <summary>Period Weights</summary>
                  <div class="advanced-block-body">
                <hr style="border-color: var(--accent); opacity: 0.5; margin: 12px 0;">
                <div class="form-group" style="margin-top: 16px;">
                  <div style="color: var(--accent);">Score Value</div>
                </div>
                <div class="row mb-2">
                  <div class="col-12">
                    <label>Junior</label>
                    <div class="row">
                      <div class="col-md-2 col-6">
                        <div class="form-group mb-1"><small>Friendship</small></div>
                        <input type="number" step="1" v-model.number="scoreValueJunior[0]" class="form-control">
                      </div>
                      <div class="col-md-2 col-6">
                        <div class="form-group mb-1"><small>Energy Change (+/-)</small></div>
                        <input type="number" step="1" v-model.number="scoreValueJunior[1]" class="form-control">
                      </div>
                      <div class="col-md-2 col-6">
                        <div class="form-group mb-1"><small>Hint</small></div>
                        <input type="number" step="1" v-model.number="scoreValueJunior[2]" class="form-control">
                      </div>
                      <div class="col-md-2 col-6" v-if="selectedScenario === 2">
                        <div class="form-group mb-1"><small>Special Training</small></div>
                        <input type="number" step="1" v-model.number="specialJunior" class="form-control">
                      </div>
                    </div>
                  </div>
                </div>
                <div class="row mb-2">
                  <div class="col-12">
                    <label>Classic</label>
                    <div class="row">
                      <div class="col-md-2 col-6">
                        <div class="form-group mb-1"><small>Friendship</small></div>
                        <input type="number" step="1" v-model.number="scoreValueClassic[0]" class="form-control">
                      </div>
                      <div class="col-md-2 col-6">
                        <div class="form-group mb-1"><small>Energy Change (+/-)</small></div>
                        <input type="number" step="1" v-model.number="scoreValueClassic[1]" class="form-control">
                      </div>
                      <div class="col-md-2 col-6">
                        <div class="form-group mb-1"><small>Hint</small></div>
                        <input type="number" step="1" v-model.number="scoreValueClassic[2]" class="form-control">
                      </div>
                      <div class="col-md-2 col-6" v-if="selectedScenario === 2">
                        <div class="form-group mb-1"><small>Special Training</small></div>
                        <input type="number" step="1" v-model.number="specialClassic" class="form-control">
                      </div>
                    </div>
                  </div>
                </div>
                <div class="row mb-2">
                  <div class="col-12">
                    <label>Senior</label>
                    <div class="row">
                      <div class="col-md-2 col-6">
                        <div class="form-group mb-1"><small>Friendship</small></div>
                        <input type="number" step="1" v-model.number="scoreValueSenior[0]" class="form-control">
                      </div>
                      <div class="col-md-2 col-6">
                        <div class="form-group mb-1"><small>Energy Change (+/-)</small></div>
                        <input type="number" step="1" v-model.number="scoreValueSenior[1]" class="form-control">
                      </div>
                      <div class="col-md-2 col-6">
                        <div class="form-group mb-1"><small>Hint</small></div>
                        <input type="number" step="1" v-model.number="scoreValueSenior[2]" class="form-control">
                      </div>
                      <div class="col-md-2 col-6" v-if="selectedScenario === 2">
                        <div class="form-group mb-1"><small>Special Training</small></div>
                        <input type="number" step="1" v-model.number="specialSenior" class="form-control">
                      </div>
                    </div>
                  </div>
                </div>
                <div class="row mb-2">
                  <div class="col-12">
                    <label>Senior After Summer</label>
                    <div class="row">
                      <div class="col-md-2 col-6">
                        <div class="form-group mb-1"><small>Friendship</small></div>
                        <input type="number" step="1" v-model.number="scoreValueSeniorAfterSummer[0]" class="form-control">
                      </div>
                      <div class="col-md-2 col-6">
                        <div class="form-group mb-1"><small>Energy Change (+/-)</small></div>
                        <input type="number" step="1" v-model.number="scoreValueSeniorAfterSummer[1]" class="form-control">
                      </div>
                      <div class="col-md-2 col-6">
                        <div class="form-group mb-1"><small>Hint</small></div>
                        <input type="number" step="1" v-model.number="scoreValueSeniorAfterSummer[2]" class="form-control">
                      </div>
                      <div class="col-md-2 col-6" v-if="selectedScenario === 2">
                        <div class="form-group mb-1"><small>Special Training</small></div>
                        <input type="number" step="1" v-model.number="specialSeniorAfterSummer" class="form-control">
                      </div>
                    </div>
                  </div>
                </div>
                <div class="row mb-2">
                  <div class="col-12">
                    <label>Finale</label>
                    <div class="row">
                      <div class="col-md-2 col-6">
                        <div class="form-group mb-1"><small>Friendship</small></div>
                        <input type="number" step="1" v-model.number="scoreValueFinale[0]" class="form-control">
                      </div>
                      <div class="col-md-2 col-6">
                        <div class="form-group mb-1"><small>Energy Change (+/-)</small></div>
                        <input type="number" step="1" v-model.number="scoreValueFinale[1]" class="form-control">
                      </div>
                      <div class="col-md-2 col-6">
                        <div class="form-group mb-1"><small>Hint</small></div>
                        <input type="number" step="1" v-model.number="scoreValueFinale[2]" class="form-control">
                      </div>
                      <div class="col-md-2 col-6" v-if="selectedScenario === 2">
                        <div class="form-group mb-1"><small>Special Training</small></div>
                        <input type="number" step="1" v-model.number="specialFinale" class="form-control">
                      </div>
                </div>
              </div>
            </div>

                <div class="form-group" style="margin-top: 8px;">
                  <label>Green Friendship Discount (%)</label>
                  <p class="text-muted small">How much less green (lv2) friendship cards score vs blue (lv1). Default: 10%</p>
                  <input type="number" step="1" min="0" max="100" v-model.number="friendshipGreenDiscount" class="form-control" style="max-width: 120px;">
                </div>

                <div v-if="selectedScenario === 2">
                <hr style="border-color: var(--accent); opacity: 0.5; margin: 12px 0;">
                <div class="form-group" style="margin-top: 16px;">
                  <div style="color: var(--accent);">Wit Special Training Multiplier</div>
                  <small style="color: var(--text-muted);">multiplier applied to special trainings in wit</small>
                </div>
                <div class="row mb-2">
                  <div class="col-md-2 col-6">
                    <div class="form-group mb-1"><small>Junior</small></div>
                    <input type="number" step="0.01" v-model.number="witSpecialJunior" class="form-control">
                  </div>
                  <div class="col-md-2 col-6">
                    <div class="form-group mb-1"><small>Classic</small></div>
                    <input type="number" step="0.01" v-model.number="witSpecialClassic" class="form-control">
                  </div>
                </div>
                </div>
                </div>
                </details>
                <details class="advanced-block" open>
                  <summary>Caps, NPC, and Stat Value</summary>
                  <div class="advanced-block-body">
                <hr style="border-color: var(--accent); opacity: 0.5; margin: 12px 0;">
                <div class="form-group" style="margin-top: 16px;">
                  <div style="color: var(--accent);">NPC Weight</div>
                  <p class="text-muted small">Score bonus per NPC card present, by period</p>
                </div>
                <div class="row">
                  <div v-for="(label, i) in ['Junior','Classic','Senior','Senior Late','Finale']" :key="i" class="col-md-2 col-6">
                    <div class="form-group mb-1"><small>{{ label }}</small></div>
                    <input type="number" step="1" v-model.number="npcWeight[i]" class="form-control">
                  </div>
                </div>

                <hr style="border-color: var(--accent); opacity: 0.5; margin: 12px 0;">
                <div class="form-group" style="margin-top: 16px;">
                  <div style="color: var(--accent);">Stat Cap Penalties</div>
                  <p class="text-muted small">When current stat reaches X% of target, multiply training score by Y%</p>
                </div>
                <div v-for="(pair, i) in statCapPenalties" :key="'scp'+i" class="row mb-1">
                  <div class="col-md-2 col-4">
                    <div class="form-group mb-1" v-if="i===0"><small>At % of target</small></div>
                    <input type="number" step="5" v-model.number="statCapPenalties[i][0]" class="form-control">
                  </div>
                  <div class="col-md-2 col-4">
                    <div class="form-group mb-1" v-if="i===0"><small>Score multiplier %</small></div>
                    <input type="number" step="5" v-model.number="statCapPenalties[i][1]" class="form-control">
                  </div>
                  <div class="col-md-2 col-4" style="padding-top: 4px;">
                    <button v-if="statCapPenalties.length > 1" @click="statCapPenalties.splice(i, 1)" class="btn btn-sm btn-outline-danger" style="margin-top: 20px;">X</button>
                  </div>
                </div>
                <button @click="statCapPenalties.push([50, 100])" class="btn btn-sm btn-outline-secondary mt-1">+ Add threshold</button>

                <hr style="border-color: var(--accent); opacity: 0.5; margin: 12px 0;">
                <div class="form-group" style="margin-top: 16px;">
                  <div style="color: var(--accent);">Stat Value</div>
                </div>
                <p>Score bonus per scanned stat gain from training facility</p>
                <div class="row">
                  <div class="col-md-2 col-6">
                    <div class="form-group mb-1"><small>Speed</small></div>
                    <input type="number" step="0.1" v-model.number="statValueMultiplier[0]" class="form-control">
                  </div>
                  <div class="col-md-2 col-6">
                    <div class="form-group mb-1"><small>Stamina</small></div>
                    <input type="number" step="0.1" v-model.number="statValueMultiplier[1]" class="form-control">
                  </div>
                  <div class="col-md-2 col-6">
                    <div class="form-group mb-1"><small>Power</small></div>
                    <input type="number" step="0.1" v-model.number="statValueMultiplier[2]" class="form-control">
                  </div>
                  <div class="col-md-2 col-6">
                    <div class="form-group mb-1"><small>Guts</small></div>
                    <input type="number" step="0.1" v-model.number="statValueMultiplier[3]" class="form-control">
                  </div>
                  <div class="col-md-2 col-6">
                    <div class="form-group mb-1"><small>Wits</small></div>
                    <input type="number" step="0.1" v-model.number="statValueMultiplier[4]" class="form-control">
                  </div>
                  <div class="col-md-2 col-6">
                    <div class="form-group mb-1"><small>SP</small></div>
                    <input type="number" step="0.1" v-model.number="statValueMultiplier[5]" class="form-control">
                  </div>
                </div>
                  </div>
                </details>

                <details v-if="selectedScenario === 2" class="advanced-block" open>
                  <summary>Aoharu Scenario Weights</summary>
                  <div class="advanced-block-body">
                <div class="row mb-2" style="margin-top: 16px; border-top: 1px solid var(--accent); padding-top: 12px;">
                  <div class="col-12">
                    <label style="color: var(--accent);">Spirit Explosion Score</label>
                    <p style="font-size: 0.9em; margin-bottom: 8px;">Score bonus for spirit explosion training per period</p>
                    <div style="margin-bottom: 10px; color: var(--accent);">Junior</div>
                    <div class="row">
                      <div v-for="(v, i) in spiritExplosionJunior" :key="i" class="col-md-2 col-6">
                        <div class="form-group mb-1"><small>{{ ['Speed','Stamina','Power','Guts','Wit'][i] }}</small></div>
                        <input type="number" step="1" v-model.number="spiritExplosionJunior[i]" class="form-control"
                          @input="onExtraWeightInput(spiritExplosionJunior, i)">
                      </div>
                    </div>
                    <div style="margin-bottom: 10px; color: var(--accent); margin-top: 10px;">Classic</div>
                    <div class="row">
                      <div v-for="(v, i) in spiritExplosionClassic" :key="i" class="col-md-2 col-6">
                        <div class="form-group mb-1"><small>{{ ['Speed','Stamina','Power','Guts','Wit'][i] }}</small></div>
                        <input type="number" step="1" v-model.number="spiritExplosionClassic[i]" class="form-control"
                          @input="onExtraWeightInput(spiritExplosionClassic, i)">
                      </div>
                    </div>
                    <div style="margin-bottom: 10px; color: var(--accent); margin-top: 10px;">Senior</div>
                    <div class="row">
                      <div v-for="(v, i) in spiritExplosionSenior" :key="i" class="col-md-2 col-6">
                        <div class="form-group mb-1"><small>{{ ['Speed','Stamina','Power','Guts','Wit'][i] }}</small></div>
                        <input type="number" step="1" v-model.number="spiritExplosionSenior[i]" class="form-control"
                          @input="onExtraWeightInput(spiritExplosionSenior, i)">
                      </div>
                    </div>
                    <div style="margin-bottom: 10px; color: var(--accent); margin-top: 10px;">Senior After Summer</div>
                    <div class="row">
                      <div v-for="(v, i) in spiritExplosionSeniorAfterSummer" :key="i" class="col-md-2 col-6">
                        <div class="form-group mb-1"><small>{{ ['Speed','Stamina','Power','Guts','Wit'][i] }}</small></div>
                        <input type="number" step="1" v-model.number="spiritExplosionSeniorAfterSummer[i]" class="form-control"
                          @input="onExtraWeightInput(spiritExplosionSeniorAfterSummer, i)">
                      </div>
                    </div>
                    <div style="margin-bottom: 10px; color: var(--accent); margin-top: 10px;">Finale</div>
                    <div class="row">
                      <div v-for="(v, i) in spiritExplosionFinale" :key="i" class="col-md-2 col-6">
                        <div class="form-group mb-1"><small>{{ ['Speed','Stamina','Power','Guts','Wit'][i] }}</small></div>
                        <input type="number" step="1" v-model.number="spiritExplosionFinale[i]" class="form-control"
                          @input="onExtraWeightInput(spiritExplosionFinale, i)">
                      </div>
                    </div>
                  </div>
                </div>
                  </div>
                </details>

                <details class="advanced-block" open>
                  <summary>Training Thresholds</summary>
                  <div class="advanced-block-body">
                <hr style="border-color: var(--accent); opacity: 0.5; margin: 12px 0;">
                <div class="form-group" style="margin-top: 16px;">
                  <div style="color: var(--accent);">Training Thresholds</div>
                </div>
                <div class="row">
                  <div class="col-md-3 col-6">
                    <div class="form-group">
                      <label for="inputSummerScoreThreshold">Summer Score Threshold</label>
                      <input v-model.number="summerScoreThreshold" type="number" step="1" min="0" class="form-control" id="inputSummerScoreThreshold">
                    </div>
                  </div>
                  <div class="col-md-3 col-6">
                    <div class="form-group">
                      <label for="inputWitRaceSearchThreshold">Race (>90% energy)/Wit training fallback</label>
                      <input v-model.number="witRaceSearchThreshold" type="number" step="1" min="0" class="form-control" id="inputWitRaceSearchThreshold">
                    </div>
                  </div>
                </div>
                  </div>
                </details>
              </div>

            </div>
            <div class="category-card" id="category-race">
              <div class="category-title">Race Settings</div>
              <div class="form-group">
                <div>Racing Style Selection</div>
              </div>

              <div class="form-group mt-3" style="border-top: 1px solid var(--accent); padding-top: 15px;">
                <label>Advanced Strategy Conditions (Evaluated top-to-bottom)</label>
                <div v-for="(rule, idx) in raceTacticConditions" :key="idx" class="d-flex align-items-center mb-2">
                  <select v-model="rule.op" class="form-control form-control-sm mr-2" style="width: auto;">
                    <option value="=">Turn =</option>
                    <option value="&gt;">Turn &gt;</option>
                    <option value="&lt;">Turn &lt;</option>
                    <option value="range">Range (exclusive)</option>
                  </select>
                  <input type="number" v-model.number="rule.val" class="form-control form-control-sm mr-2" style="width: 80px;" placeholder="Turn">
                  <span v-if="rule.op === 'range'" class="mr-2">&lt; Turn &lt;</span>
                  <input v-if="rule.op === 'range'" type="number" v-model.number="rule.val2" class="form-control form-control-sm mr-2" style="width: 80px;" placeholder="Turn">
                  <select v-model.number="rule.tactic" class="form-control form-control-sm mr-2" style="flex: 1;">
                    <option :value="1">End-Closer</option>
                    <option :value="2">Late-Surger</option>
                    <option :value="3">Pace-Chaser</option>
                    <option :value="4">Front-Runner</option>
                  </select>
                  <button class="btn btn-sm btn-outline-secondary mr-1" type="button" @click="moveRuleUp(idx)" :disabled="idx===0">↑</button>
                  <button class="btn btn-sm btn-outline-secondary mr-1" type="button" @click="moveRuleDown(idx)" :disabled="idx===raceTacticConditions.length-1">↓</button>
                  <button class="btn btn-sm btn-outline-danger" type="button" @click="removeRule(idx)">×</button>
                </div>
                <div class="d-flex align-items-center mb-2">
                  <button class="btn btn-sm btn-outline-primary mr-2" type="button" @click="addRule">+ Add Condition</button>
                  <button class="btn btn-sm btn-outline-info" type="button" @click="showTurnInfo = !showTurnInfo">
                    <i class="fas fa-info-circle"></i> Turn Reference
                  </button>
                </div>
                
                <div v-if="showTurnInfo" class="alert alert-info p-2 mb-2" style="font-size: 0.8em; max-height: 400px; overflow-y: auto;">
                  <strong>Turn Reference Chart:</strong>
                  <div class="row no-gutters mt-2">
                    <div class="col px-1" v-for="(col, colIdx) in turnReferenceColumns" :key="colIdx">
                      <div v-for="item in col" :key="item.turn" class="d-flex justify-content-between border-bottom border-light pb-1 mb-1">
                        <span class="font-weight-bold" style="min-width: 25px;">{{ item.turn }}</span>
                        <span class="text-right text-truncate" :title="item.desc">{{ item.desc }}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <small class="d-block text-muted mt-1">If no condition matches, no change is made. Conditions are evaluated from top to bottom.</small>
              </div>
              <div class="form-group">
                <div class="row">
                  <div class="col">
                    <div class="form-group">
                      <label for="race-select">Additional Race Schedule</label>
                      <textarea type="text" disabled v-model="extraRace" class="form-control"
                        id="race-select"></textarea>
                    </div>
                  </div>
                </div>
                <div class="form-group">
                  <div class="race-options-header" @click="switchRaceList">
                    <div class="race-options-title">
                      <i class="fas fa-flag-checkered"></i>
                      Race Options
                    </div>
                    <div class="race-options-toggle">
                      <span class="toggle-text">{{ showRaceList ? 'Hide' : 'Show' }}</span>
                      <i class="fas" :class="showRaceList ? 'fa-chevron-up' : 'fa-chevron-down'"></i>
                    </div>
                  </div>
                </div>
                <div v-if="showRaceList" class="race-options-content">
                  <!-- Race Filter Controls (tidy grid) -->
                  <div class="race-filters mb-3">
                    <div class="filter">
                      <label>Search Races:</label>
                      <input type="text" v-model="raceSearch" class="form-control" placeholder="Search by race name...">
                    </div>
                    <div class="filter">
                      <label>Character Filter: <i class="fas fa-info-circle text-muted"
                          title="Filter races based on character's terrain/distance aptitude and training schedule"></i></label>
                      <select v-model="selectedCharacter" class="form-control" @change="onCharacterChange">
                        <option value="">All Characters</option>
                        <option v-for="character in characterList" :key="character.name" :value="character.name">
                          {{ character.name }}</option>
                      </select>
                      <small v-if="selectedCharacter" class="text-info">
                        {{ getCompatibleRacesCount() }} compatible, {{ getIncompatibleRacesCount() }} filtered out
                      </small>
                      <small v-else class="text-muted">
                        Select a character to filter races by compatibility
                      </small>
                    </div>
                    <div class="quick">
                      <label>Quick Selection:</label>
                      <div class="btn-group" role="group">
                        <button type="button" class="btn btn-sm btn-outline-success" @click="selectAllGI">Select All
                          GI</button>
                        <button type="button" class="btn btn-sm btn-outline-success" @click="selectAllGII">Select All
                          GII</button>
                        <button type="button" class="btn btn-sm btn-outline-success" @click="selectAllGIII">Select All
                          GIII</button>
                        <button type="button" class="btn btn-sm btn-outline-warning" @click="clearAllRaces">Clear
                          All</button>
                      </div>
                    </div>

                    <div class="filter">
                      <label>Grade:</label>
                      <div class="btn-group btn-group-sm d-flex" role="group">
                        <button type="button" class="btn" :class="{ 'btn-primary': showGI, 'btn-outline-primary': !showGI }" @click="showGI = !showGI"><span>GI</span></button>
                        <button type="button" class="btn" :class="{ 'btn-primary': showGII, 'btn-outline-primary': !showGII }" @click="showGII = !showGII"><span>GII</span></button>
                        <button type="button" class="btn" :class="{ 'btn-primary': showGIII, 'btn-outline-primary': !showGIII }" @click="showGIII = !showGIII"><span>GIII</span></button>
                        <button type="button" class="btn" :class="{ 'btn-primary': showOP, 'btn-outline-primary': !showOP }" @click="showOP = !showOP"><span>OP</span></button>
                        <button type="button" class="btn" :class="{ 'btn-primary': showPREOP, 'btn-outline-primary': !showPREOP }" @click="showPREOP = !showPREOP"><span>PRE-OP</span></button>
                      </div>
                    </div>
                    <div class="filter">
                      <label>Terrain:</label>
                      <div class="btn-group btn-group-sm d-flex" role="group">
                        <button type="button" class="btn" :class="{ 'btn-success': showTurf, 'btn-outline-success': !showTurf }" @click="showTurf = !showTurf"><span>Turf</span></button>
                        <button type="button" class="btn" :class="{ 'btn-warning': showDirt, 'btn-outline-warning': !showDirt }" @click="showDirt = !showDirt"><span>Dirt</span></button>
                      </div>
                    </div>
                    <div class="distance">
                      <label>Distance:</label>
                      <div class="btn-group btn-group-sm d-flex" role="group">
                        <button type="button" class="btn" :class="{ 'btn-info': showSprint, 'btn-outline-info': !showSprint }" @click="showSprint = !showSprint"><span>Sprint</span></button>
                        <button type="button" class="btn" :class="{ 'btn-info': showMile, 'btn-outline-info': !showMile }" @click="showMile = !showMile"><span>Mile</span></button>
                        <button type="button" class="btn" :class="{ 'btn-info': showMedium, 'btn-outline-info': !showMedium }" @click="showMedium = !showMedium"><span>Medium</span></button>
                        <button type="button" class="btn" :class="{ 'btn-info': showLong, 'btn-outline-info': !showLong }" @click="showLong = !showLong"><span>Long</span></button>
                      </div>
                    </div>
                  </div>



                  <!-- Race Lists -->
                  <div class="row">
                    <div class="col-md-4">
                      <div class="card">
                        <div class="card-header">
                          <h6 class="mb-0">Year 1 (Junior Year)</h6>
                        </div>
                        <div class="card-body" style="max-height: 400px; overflow-y: auto;">
                          <div class="race-grid">
                            <div v-for="race in filteredRaces_1" :key="race.id" class="race-toggle"
                              :class="{ 'selected': extraRace.includes(race.id) }" @click="toggleRace(race.id)">
                              <div class="race-content">
                                <div class="race-name">{{ race.name }}</div>
                                <div class="race-badges">
                                  <span v-if="race.type === 'G3'" class="badge badge-pill"
                                    style="background-color: #58C471;">{{ race.type }}</span>
                                  <span v-if="race.type === 'G2'" class="badge badge-pill"
                                    style="background-color: #F75A86;">{{ race.type }}</span>
                                  <span v-if="race.type === 'G1'" class="badge badge-pill"
                                    style="background-color: #3485E3;">{{ race.type }}</span>
                                  <span v-if="race.type === 'OP'" class="badge badge-pill"
                                    style="background-color: #FFA500;">{{ race.type }}</span>
                                  <span v-if="race.type === 'PRE-OP'" class="badge badge-pill"
                                    style="background-color: #9370DB;">{{ race.type }}</span>
                                  <span v-if="race.terrain === 'Turf'" class="badge badge-pill"
                                    style="background-color: #28a745; color: white;">{{ race.terrain }}</span>
                                  <span v-if="race.terrain === 'Dirt'" class="badge badge-pill"
                                    style="background-color: #ffc107; color: black;">{{ race.terrain }}</span>
                                  <span v-if="race.distance === 'Sprint'" class="badge badge-pill"
                                    style="background-color: #17a2b8; color: white;">{{ race.distance }}</span>
                                  <span v-if="race.distance === 'Mile'" class="badge badge-pill"
                                    style="background-color: #17a2b8; color: white;">{{ race.distance }}</span>
                                  <span v-if="race.distance === 'Medium'" class="badge badge-pill"
                                    style="background-color: #17a2b8; color: white;">{{ race.distance }}</span>
                                  <span v-if="race.distance === 'Long'" class="badge badge-pill"
                                    style="background-color: #17a2b8; color: white;">{{ race.distance }}</span>
                                </div>
                                <div class="race-details">{{ race.date }} ({{ getTurnFromDate(race.date) }}) - {{ race.venue }}</div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div class="col-md-4">
                      <div class="card">
                        <div class="card-header">
                          <h6 class="mb-0">Year 2 (Classic Year)</h6>
                        </div>
                        <div class="card-body" style="max-height: 400px; overflow-y: auto;">
                          <div class="race-grid">
                            <div v-for="race in filteredRaces_2" :key="race.id" class="race-toggle"
                              :class="{ 'selected': extraRace.includes(race.id) }" @click="toggleRace(race.id)">
                              <div class="race-content">
                                <div class="race-name">{{ race.name }}</div>
                                <div class="race-badges">
                                  <span v-if="race.type === 'G3'" class="badge badge-pill"
                                    style="background-color: #58C471;">{{ race.type }}</span>
                                  <span v-if="race.type === 'G2'" class="badge badge-pill"
                                    style="background-color: #F75A86;">{{ race.type }}</span>
                                  <span v-if="race.type === 'G1'" class="badge badge-pill"
                                    style="background-color: #3485E3;">{{ race.type }}</span>
                                  <span v-if="race.type === 'OP'" class="badge badge-pill"
                                    style="background-color: #FFA500;">{{ race.type }}</span>
                                  <span v-if="race.type === 'PRE-OP'" class="badge badge-pill"
                                    style="background-color: #9370DB;">{{ race.type }}</span>
                                  <span v-if="race.terrain === 'Turf'" class="badge badge-pill"
                                    style="background-color: #28a745; color: white;">{{ race.terrain }}</span>
                                  <span v-if="race.terrain === 'Dirt'" class="badge badge-pill"
                                    style="background-color: #ffc107; color: black;">{{ race.terrain }}</span>
                                  <span v-if="race.distance === 'Sprint'" class="badge badge-pill"
                                    style="background-color: #17a2b8; color: white;">{{ race.distance }}</span>
                                  <span v-if="race.distance === 'Mile'" class="badge badge-pill"
                                    style="background-color: #17a2b8; color: white;">{{ race.distance }}</span>
                                  <span v-if="race.distance === 'Medium'" class="badge badge-pill"
                                    style="background-color: #17a2b8; color: white;">{{ race.distance }}</span>
                                  <span v-if="race.distance === 'Long'" class="badge badge-pill"
                                    style="background-color: #17a2b8; color: white;">{{ race.distance }}</span>
                                </div>
                                <div class="race-details">{{ race.date }} ({{ getTurnFromDate(race.date) }}) - {{ race.venue }}</div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div class="col-md-4">
                      <div class="card">
                        <div class="card-header">
                          <h6 class="mb-0">Year 3 (Senior Year)</h6>
                        </div>
                        <div class="card-body" style="max-height: 400px; overflow-y: auto;">
                          <div class="race-grid">
                            <div v-for="race in filteredRaces_3" :key="race.id" class="race-toggle"
                              :class="{ 'selected': extraRace.includes(race.id) }" @click="toggleRace(race.id)">
                              <div class="race-content">
                                <div class="race-name">{{ race.name }}</div>
                                <div class="race-badges">
                                  <span v-if="race.type === 'G3'" class="badge badge-pill"
                                    style="background-color: #58C471;">{{ race.type }}</span>
                                  <span v-if="race.type === 'G2'" class="badge badge-pill"
                                    style="background-color: #F75A86;">{{ race.type }}</span>
                                  <span v-if="race.type === 'G1'" class="badge badge-pill"
                                    style="background-color: #3485E3;">{{ race.type }}</span>
                                  <span v-if="race.type === 'OP'" class="badge badge-pill"
                                    style="background-color: #FFA500;">{{ race.type }}</span>
                                  <span v-if="race.type === 'PRE-OP'" class="badge badge-pill"
                                    style="background-color: #9370DB;">{{ race.type }}</span>
                                  <span v-if="race.terrain === 'Turf'" class="badge badge-pill"
                                    style="background-color: #28a745; color: white;">{{ race.terrain }}</span>
                                  <span v-if="race.terrain === 'Dirt'" class="badge badge-pill"
                                    style="background-color: #ffc107; color: black;">{{ race.terrain }}</span>
                                  <span v-if="race.distance === 'Sprint'" class="badge badge-pill"
                                    style="background-color: #17a2b8; color: white;">{{ race.distance }}</span>
                                  <span v-if="race.distance === 'Mile'" class="badge badge-pill"
                                    style="background-color: #17a2b8; color: white;">{{ race.distance }}</span>
                                  <span v-if="race.distance === 'Medium'" class="badge badge-pill"
                                    style="background-color: #17a2b8; color: white;">{{ race.distance }}</span>
                                  <span v-if="race.distance === 'Long'" class="badge badge-pill"
                                    style="background-color: #17a2b8; color: white;">{{ race.distance }}</span>
                                </div>
                                <div class="race-details">{{ race.date }} ({{ getTurnFromDate(race.date) }}) - {{ race.venue }}</div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div class="category-card" id="category-skill">
              <div class="category-title">Skill Settings</div>
              <div class="form-group mb-0">
                <div class="row">
                  <div class="col">
                    <div class="form-group">
                      <label for="skill-learn">Skill Learning</label>
                    </div>
                  </div>
                  <div class="col-auto">
                    <div class="form-group">
                      <div class="skill-notes-alert">
                        <i class="fas fa-info-circle"></i>
                        <span><strong>Notes:</strong> Left Click to Select - Right Click to Blacklist</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Skill Learning Section -->
              <div class="form-group">

                <!-- Priority 0 Section -->
                <div class="priority-section">
                  <label class="form-label section-heading">
                    <i class="fas fa-trophy"></i>
                    Priority 0
                  </label>
                  <div class="selected-skills-box"
                       @dragover.prevent
                       @dragenter.prevent="onDragEnterPriority(0)"
                       @dragleave.prevent="onDragLeavePriority(0)"
                       @drop.prevent="onDropToPriority(0)"
                       :class="{ 'drop-hover': dropHoverTarget && dropHoverTarget.type === 'priority' && dropHoverTarget.priority === 0 }">
                    <div v-if="getSelectedSkillsForPriority(0).length === 0" class="empty-state">
                      The skill that user already select listed in here
                    </div>
                    <div v-else class="selected-skills-list">
                      <div v-for="skillName in getSelectedSkillsForPriority(0)" :key="skillName"
                        class="selected-skill-item"
                        draggable="true"
                        @dragstart="onDragStartSkill(skillName, 'priority', 0)"
                        @dragend="onDragEndSkill"
                        :class="{ dragging: draggingSkillName === skillName }">
                        {{ skillName }}
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Dynamic Priority Sections -->
                <div v-for="priority in getActivePriorities().slice(1)" :key="priority" class="priority-section">
                  <label class="form-label section-heading">
                    <i class="fas fa-medal"></i>
                    Priority {{ priority }}
                  </label>
                  <div class="selected-skills-box"
                       @dragover.prevent
                       @dragenter.prevent="onDragEnterPriority(priority)"
                       @dragleave.prevent="onDragLeavePriority(priority)"
                       @drop.prevent="onDropToPriority(priority)"
                       :class="{ 'drop-hover': dropHoverTarget && dropHoverTarget.type === 'priority' && dropHoverTarget.priority === priority }">
                    <div v-if="getSelectedSkillsForPriority(priority).length === 0" class="empty-state">
                      The skill that user already select listed in here
                    </div>
                    <div v-else class="selected-skills-list">
                      <div v-for="skillName in getSelectedSkillsForPriority(priority)" :key="skillName"
                        class="selected-skill-item"
                        draggable="true"
                        @dragstart="onDragStartSkill(skillName, 'priority', priority)"
                        @dragend="onDragEndSkill"
                        :class="{ dragging: draggingSkillName === skillName }">
                        {{ skillName }}
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Add/Remove Priority Buttons -->
                <div class="form-group mt-3">
                  <div class="btn-group" role="group">
                    <button type="button" class="btn btn-outline-primary btn-sm" @click="addPriority">
                      Add Priority
                    </button>
                    <button type="button" class="btn btn-outline-danger btn-sm" @click="removeLastPriority"
                      :disabled="activePriorities.length <= 1">
                      Undo
                    </button>
                  </div>
                </div>
              </div>

              <!-- Blacklist Section (inside Skill Settings card) -->
              <div class="form-group">
                <label class="form-label section-heading">
                  <i class="fas fa-ban"></i>
                  Blacklist
                </label>
                <div class="blacklist-box"
                     @dragover.prevent
                     @dragenter.prevent="onDragEnterBlacklist"
                     @dragleave.prevent="onDragLeaveBlacklist"
                     @drop.prevent="onDropToBlacklist"
                     :class="{ 'drop-hover': dropHoverTarget && dropHoverTarget.type === 'blacklist' }">
                  <div v-if="blacklistedSkills.length === 0" class="empty-state">
                    The skill that user already select blacklisted in here
                  </div>
                  <div v-else class="blacklisted-skills-list">
                    <div v-for="skillName in blacklistedSkills" :key="skillName" class="blacklisted-skill-item"
                         draggable="true"
                         @dragstart="onDragStartSkill(skillName, 'blacklist')"
                         @dragend="onDragEndSkill"
                         :class="{ dragging: draggingSkillName === skillName }">
                      {{ skillName }}
                    </div>
                  </div>
                </div>
              </div>

              <!-- Skill List Section (inside Skill Settings card) -->
              <div class="form-group">
                <div class="skill-list-header" @click="toggleSkillList">
                  <div class="skill-list-title">
                    <i class="fas fa-list"></i>
                    Skill List
                  </div>
                  <div class="skill-list-toggle">
                    <span class="toggle-text">{{ showSkillList ? 'Hide' : 'Show' }}</span>
                    <i class="fas" :class="showSkillList ? 'fa-chevron-up' : 'fa-chevron-down'"></i>
                  </div>
                </div>


                <div v-if="showSkillList" class="skill-list-content">
                  <!-- Skill Filter System -->
                  <div class="skill-filter-section">
                    <div class="row">
                      <div class="col-md-3">
                        <label class="filter-label">Strategy</label>
                        <select v-model="skillFilter.strategy" class="form-control form-control-sm">
                          <option value="">All Strategies</option>
                          <option v-for="strategy in availableStrategies" :key="strategy" :value="strategy">
                            {{ strategy }}
                          </option>
                        </select>
                      </div>
                      <div class="col-md-3">
                        <label class="filter-label">Distance</label>
                        <select v-model="skillFilter.distance" class="form-control form-control-sm">
                          <option value="">All Distances</option>
                          <option v-for="distance in availableDistances" :key="distance" :value="distance">
                            {{ distance }}
                          </option>
                        </select>
                      </div>
                      <div class="col-md-3">
                        <label class="filter-label">Tier</label>
                        <select v-model="skillFilter.tier" class="form-control form-control-sm">
                          <option value="">All Tiers</option>
                          <option v-for="tier in availableTiers" :key="tier" :value="tier">
                            {{ tier }}
                          </option>
                        </select>
                      </div>
                      <div class="col-md-3">
                        <label class="filter-label">Rarity</label>
                        <select v-model="skillFilter.rarity" class="form-control form-control-sm">
                          <option value="">All Rarities</option>
                          <option v-for="rarity in availableRarities" :key="rarity" :value="rarity">
                            {{ rarity }}
                          </option>
                        </select>
                      </div>
                    </div>
                    <div class="row mt-2">
                      <div class="col-md-8">
                        <label class="filter-label">Search Skill</label>
                        <input v-model.trim="skillFilter.query" type="text" class="form-control form-control-sm"
                          placeholder="Search by skill name or description" />
                      </div>
                      <div class="col-md-4 d-flex align-items-end">
                        <div class="skill-filter-actions ml-auto">
                          <button type="button" class="btn btn--outline" @click="onSelectAllFiltered">Select All</button>
                          <button type="button" class="btn btn--outline" @click="onBlacklistAllFiltered">Blacklist All</button>
                          <button type="button" class="btn btn--outline" @click="onClearAllFiltered">Clear All</button>
                          <button type="button" class="btn btn--outline" @click="onUnblacklistAllFiltered">Unblacklist All</button>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div class="skill-list-container">
                    <div class="skill-type-grid">
                      <div v-for="(skills, skillType) in filteredSkillsByType" :key="skillType" class="skill-type-card">
                        <div class="skill-type-header">
                          <h6 class="skill-type-title">{{ skillType }}</h6>
                          <span class="skill-count">{{ skills.length }} skills</span>
                        </div>
                        <div class="skill-type-content">
                          <div v-for="skill in skills" :key="skill.name" class="skill-item" :class="{
                            'selected': selectedSkills.includes(skill.name),
                            'blacklisted': blacklistedSkills.includes(skill.name)
                          }" @click="toggleSkill(skill.name)" @contextmenu.prevent="toggleBlacklistSkill(skill.name)">
                            <div class="skill-header">
                              <div class="skill-name">{{ skill.name }}</div>
                              <div class="skill-cost">Cost: {{ skill.base_cost }}</div>
                            </div>
                            <div class="skill-details">
                              <div class="skill-type">{{ skill.skill_type }}</div>
                              <div class="skill-description">{{ skill.description }}</div>
                              <div class="skill-tags">
                                <span v-if="skill.strategy" class="skill-tag strategy-tag">{{ skill.strategy }}</span>
                                <span v-if="skill.distance" class="skill-tag distance-tag">{{ skill.distance }}</span>
                                <span v-if="skill.tier" class="skill-tag tier-tag" :data-tier="skill.tier">{{ skill.tier
                                }}</span>
                                <span v-if="skill.rarity" class="skill-tag rarity-tag">{{ skill.rarity }}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Skill Learning Settings (inside Skill Settings card) -->
              <div class="form-group toggle-row">
                <div class="row align-items-center">
                  <div class="col-md-3">
                    <label class="d-block mb-1">Only learn listed skills</label>
                    <div class="token-toggle" role="group" aria-label="Only learn listed skills">
                      <button type="button" class="token" :class="{ active: learnSkillOnlyUserProvided }"
                        @click="learnSkillOnlyUserProvided = true">Yes</button>
                      <button type="button" class="token" :class="{ active: !learnSkillOnlyUserProvided }"
                        @click="learnSkillOnlyUserProvided = false">No</button>
                    </div>
                  </div>
                  <div class="col-md-3">
                    <label class="d-block mb-1">Learn before races</label>
                    <div class="token-toggle" :class="{ disabled: true }" role="group" aria-label="Learn before races">
                      <button type="button" class="token" :disabled="true">Yes</button>
                      <button type="button" class="token active" :disabled="true">No</button>
                    </div>
                  </div>
                  <div class="col-md-3">
                    <div class="form-group">
                      <label for="inputSkillLearnThresholdLimit">Learn when skill points ≥</label>
                      <input v-model="learnSkillThreshold" type="number" class="form-control"
                        id="inputSkillLearnThresholdLimit" placeholder="">
                    </div>
                  </div>
                  <div class="col-md-3">
                    <label class="d-block mb-1">Manual purchase at end</label>
                    <div class="token-toggle" role="group" aria-label="Manual purchase at end">
                      <button type="button" class="token" :class="{ active: manualPurchase }"
                        @click="manualPurchase = true">On</button>
                      <button type="button" class="token" :class="{ active: !manualPurchase }"
                        @click="manualPurchase = false">Off</button>
                    </div>
                  </div>
                </div>
                <div class="row align-items-center mt-2">
                  <div class="col-md-4">
                    <label class="d-block mb-1">Skip double circles unless high hint</label>
                    <div class="token-toggle" role="group" aria-label="Skip double circles unless high hint">
                      <button type="button" class="token" :class="{ active: skipDoubleCircleUnlessHighHint }"
                        @click="skipDoubleCircleUnlessHighHint = true">On</button>
                      <button type="button" class="token" :class="{ active: !skipDoubleCircleUnlessHighHint }"
                        @click="skipDoubleCircleUnlessHighHint = false">Off</button>
                    </div>
                  </div>
                  <div class="col-md-6">
                    <label class="d-block mb-1">Override insufficient fans forced races</label>
                    <div class="token-toggle" role="group" aria-label="Override insufficient fans forced races">
                      <button type="button" class="token" :class="{ active: overrideInsufficientFansForcedRaces }"
                        @click="overrideInsufficientFansForcedRaces = true">On</button>
                      <button type="button" class="token" :class="{ active: !overrideInsufficientFansForcedRaces }"
                        @click="overrideInsufficientFansForcedRaces = false">Off</button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          <div class="category-card" id="category-event">
              <div class="category-title">Event Settings</div>

              <div class="form-group mt-4 event-weights-section">
                <div class="event-weights-header">
                  <div class="event-weights-title">
                    <i class="fas fa-calculator"></i>
                    Event Scoring Weights
                  </div>
                  <button type="button" class="btn btn-sm btn-outline-secondary reset-weights-btn" @click="resetEventWeights">
                    <i class="fas fa-undo"></i> Reset to Defaults
                  </button>
                </div>
                <div class="event-weights-description">
                  <p class="description-text">
                    <strong>How it works:</strong> The bot calculates a score for each event choice by multiplying every gain by their weights, then selects the highest scoring option.
                  </p>
                  <div class="calculation-formula">
                    <strong>Example:</strong> <code>Score = (Friend × Weight) + (Speed × Weight) + (Stamina × Weight) + (Power × Weight) + (Guts × Weight) + (Wits × Weight) + (Hint × Weight) + (Skill Pts × Weight)</code>
                  </div>
                  <div class="special-cases">
                    <strong>Special Behaviors:</strong>
                    <ul>
                      <li><strong>Mood (9999):</strong> Extremely high weight ensures mood recovery is prioritized when mood is low. Auto-disabled when mood is maxed (Level 5).</li>
                      <li><strong>Max Energy (50):</strong> Weight of 50. Auto-disabled in Senior year.</li>
                      <li><strong>Energy (16):</strong> Dynamically adjusted based on current energy: disabled when energy > 84 (near full), increased to 30 when energy is 40-60 (to avoid rest), 16 otherwise.</li>
                    </ul>
                  </div>
                </div>
                <div class="table-responsive">
                  <table class="table table-sm table-bordered event-weights-table">
                    <thead>
                      <tr>
                        <th style="width: 20%;">Stat</th>
                        <th style="width: 26.67%;">Junior</th>
                        <th style="width: 26.67%;">Classic</th>
                        <th style="width: 26.67%;">Senior</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td><strong>Friend</strong></td>
                        <td><input type="number" v-model.number="eventWeightsJunior.Friendship" class="form-control form-control-sm" min="0" max="100"></td>
                        <td><input type="number" v-model.number="eventWeightsClassic.Friendship" class="form-control form-control-sm" min="0" max="100"></td>
                        <td><input type="number" v-model.number="eventWeightsSenior.Friendship" class="form-control form-control-sm" min="0" max="100"></td>
                      </tr>
                      <tr>
                        <td><strong>Speed</strong></td>
                        <td><input type="number" v-model.number="eventWeightsJunior.Speed" class="form-control form-control-sm" min="0" max="100"></td>
                        <td><input type="number" v-model.number="eventWeightsClassic.Speed" class="form-control form-control-sm" min="0" max="100"></td>
                        <td><input type="number" v-model.number="eventWeightsSenior.Speed" class="form-control form-control-sm" min="0" max="100"></td>
                      </tr>
                      <tr>
                        <td><strong>Stamina</strong></td>
                        <td><input type="number" v-model.number="eventWeightsJunior.Stamina" class="form-control form-control-sm" min="0" max="100"></td>
                        <td><input type="number" v-model.number="eventWeightsClassic.Stamina" class="form-control form-control-sm" min="0" max="100"></td>
                        <td><input type="number" v-model.number="eventWeightsSenior.Stamina" class="form-control form-control-sm" min="0" max="100"></td>
                      </tr>
                      <tr>
                        <td><strong>Power</strong></td>
                        <td><input type="number" v-model.number="eventWeightsJunior.Power" class="form-control form-control-sm" min="0" max="100"></td>
                        <td><input type="number" v-model.number="eventWeightsClassic.Power" class="form-control form-control-sm" min="0" max="100"></td>
                        <td><input type="number" v-model.number="eventWeightsSenior.Power" class="form-control form-control-sm" min="0" max="100"></td>
                      </tr>
                      <tr>
                        <td><strong>Guts</strong></td>
                        <td><input type="number" v-model.number="eventWeightsJunior.Guts" class="form-control form-control-sm" min="0" max="100"></td>
                        <td><input type="number" v-model.number="eventWeightsClassic.Guts" class="form-control form-control-sm" min="0" max="100"></td>
                        <td><input type="number" v-model.number="eventWeightsSenior.Guts" class="form-control form-control-sm" min="0" max="100"></td>
                      </tr>
                      <tr>
                        <td><strong>Wits</strong></td>
                        <td><input type="number" v-model.number="eventWeightsJunior.Wits" class="form-control form-control-sm" min="0" max="100"></td>
                        <td><input type="number" v-model.number="eventWeightsClassic.Wits" class="form-control form-control-sm" min="0" max="100"></td>
                        <td><input type="number" v-model.number="eventWeightsSenior.Wits" class="form-control form-control-sm" min="0" max="100"></td>
                      </tr>
                      <tr>
                        <td><strong>Hint</strong></td>
                        <td><input type="number" v-model.number="eventWeightsJunior.Hint" class="form-control form-control-sm" min="0" max="100"></td>
                        <td><input type="number" v-model.number="eventWeightsClassic.Hint" class="form-control form-control-sm" min="0" max="100"></td>
                        <td><input type="number" v-model.number="eventWeightsSenior.Hint" class="form-control form-control-sm" min="0" max="100"></td>
                      </tr>
                      <tr>
                        <td><strong>Skill Pts</strong></td>
                        <td><input type="number" v-model.number="eventWeightsJunior['Skill Points']" class="form-control form-control-sm" min="0" max="100"></td>
                        <td><input type="number" v-model.number="eventWeightsClassic['Skill Points']" class="form-control form-control-sm" min="0" max="100"></td>
                        <td><input type="number" v-model.number="eventWeightsSenior['Skill Points']" class="form-control form-control-sm" min="0" max="100"></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <div class="form-group">
                <div class="mb-2" style="color: var(--accent); font-weight: 700;">
                  Unselected = Autopick best option
                </div>
                <input v-model.trim="eventQuery" type="text" class="form-control form-control-sm" placeholder="Search by event name" />
              </div>

              <div class="form-group">
                <div class="skill-list-header" @click="toggleEventList">
                  <div class="skill-list-title">
                    <i class="fas fa-list"></i>
                    Event List
                  </div>
                  <div class="skill-list-toggle">
                    <span class="toggle-text">{{ showEventList ? 'Hide' : 'Show' }}</span>
                    <i class="fas" :class="showEventList ? 'fa-chevron-up' : 'fa-chevron-down'"></i>
                  </div>
                </div>

                <div v-if="showEventList" class="skill-list-content">
                  <ul class="list-group">
                    <li v-for="name in eventListFiltered()" :key="name" class="list-group-item d-flex justify-content-between align-items-center">
                      <span class="text-truncate" style="max-width: 70%;" :title="name">{{ name }}</span>
                      <div class="btn-group btn-group-sm">
                        <button
                          v-for="n in getEventOptionCount(name)"
                          :key="n"
                          type="button"
                          class="btn event-choice-btn"
                          :class="isEventChoiceSelected(name, n) ? 'selected' : 'unselected'"
                          @click="onEventChoiceClick(name, n)">
                          {{ n }}
                        </button>
                      </div>
                    </li>
                  </ul>
                                  </div>
              </div>
            </div>

          </form>
          <!-- <div class="part">
            <br>
                            <h6>Scheduled Settings</h6>
            <hr />
            <div class="row">
              <label for="cronInput" class="col-2 col-form-label">Cron Expression</label>
              <div class="col-10">
                <input v-model="cron"  class="form-control" id="cronInput">
              </div>
            </div>
          </div> -->
        </div>
        <div class="modal-footer d-none"></div>
      </div>
      <!-- Aoharu Cup Configuration Modal -->
      <AoharuConfigModal v-model:show="showAoharuConfigModal" :preliminaryRoundSelections="preliminaryRoundSelections"
        :aoharuTeamNameSelection="aoharuTeamNameSelection" @confirm="handleAoharuConfigConfirm"></AoharuConfigModal>
      <!-- URA Configuration Modal -->
      <UraConfigModal v-model:show="showUraConfigModal" :skillEventWeight="skillEventWeight"
        :resetSkillEventWeightList="resetSkillEventWeightList" @confirm="handleUraConfigConfirm"></UraConfigModal>
      <!-- Support Card Selection Modal -->
      <SupportCardSelectModal v-model:show="showSupportCardSelectModal" @cancel="closeSupportCardSelectModal"
        @confirm="handleSupportCardConfirm"></SupportCardSelectModal>
      <!-- Overlay layer, supports two types of modals -->
      <div v-if="showAoharuConfigModal || showSupportCardSelectModal || showUraConfigModal"
        class="modal-backdrop-overlay" @click.stop></div>
      <!-- Notification -->
      <div class="position-fixed" style="z-index: 5; right: 40%; width: 300px;">
        <div id="liveToast" class="toast hide" role="alert" aria-live="assertive" aria-atomic="true" data-delay="2000">
          <div class="toast-body">
            Preset saved successfully
          </div>
        </div>
      </div>
      <!-- Weight Warning Notification -->
      <div class="position-fixed" style="z-index: 5; right: 40%; width: 300px;">
        <div id="weightWarningToast" class="toast hide" role="alert" aria-live="assertive" aria-atomic="true"
          data-delay="2000">
          <div class="toast-body" style="color: #856404;">
            <b>All weights in the same year cannot be -1</b>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- Custom Character Change Confirmation Modal -->
  <div v-if="showCharacterChangeModal" class="modal fade show character-change-modal"
    style="display: block; background-color: rgba(0,0,0,0.5);" tabindex="-1">
    <div class="modal-dialog modal-dialog-centered">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title">Character Filter Change</h5>
          <button type="button" class="close" @click="closeCharacterChangeModal">
            <span>&times;</span>
          </button>
        </div>
        <div class="modal-body">
          <p>You have <strong>{{ extraRace.length }}</strong> race(s) selected.</p>
          <div v-if="selectedCharacter">
            <p>Changing to <strong>"{{ selectedCharacter }}"</strong> will:</p>
            <ul>
              <li>Show <strong>{{ getCompatibleRacesCount() }}</strong> compatible race(s)</li>
              <li>Hide <strong>{{ getIncompatibleRacesCount() }}</strong> incompatible race(s)</li>
            </ul>
          </div>
          <div v-else>
            <p>Removing character filter will show all races.</p>
          </div>
          <p>What would you like to do with your current race selections?</p>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" @click="handleClearSelection">
            <i class="fas fa-trash"></i> Clear Selection
            <small class="d-block">Clear the entire selection</small>
          </button>
          <button type="button" class="btn btn-primary" @click="handleFilterSelection">
            <i class="fas fa-filter"></i> Filter Selection Based on Character Compatibility
            <small class="d-block">Keep the selection but only keep the character compatibility that has already
              selected</small>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/***** Event Settings styling *****/
#category-event .event-choice-btn.selected {
  background-color: var(--accent);
  color: #000;
  border-color: var(--accent);
}
#category-event .event-choice-btn.unselected {
  background-color: transparent;
  color: var(--text);
}
#category-event .skill-list-header {
  border: 1px solid var(--accent) !important;
  border-radius: var(--radius-sm) var(--radius-sm) 0 0 !important;
  background: color-mix(in srgb, var(--accent) 8%, transparent) !important;
}
#category-event .skill-list-content {
  border: 1px solid var(--accent) !important;
  border-radius: 0 0 var(--radius-sm) var(--radius-sm) !important;
  background: color-mix(in srgb, var(--accent) 4%, transparent) !important;
}

.selected-skill-item,
.blacklisted-skill-item {
  transition: transform 0.15s ease, box-shadow 0.15s ease, opacity 0.15s ease;
}
.selected-skill-item.dragging,
.blacklisted-skill-item.dragging {
  transform: scale(1.05);
  box-shadow: 0 8px 18px rgba(0,0,0,0.25);
  opacity: 0.8;
  cursor: grabbing;
}
.selected-skills-box.drop-hover,
.blacklist-box.drop-hover {
  outline: 2px dashed var(--accent);
  background: color-mix(in srgb, var(--accent) 6%, transparent);
}

#category-skill .skill-filter-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: flex-end;
  width: 100%;
}
#category-skill .skill-filter-actions .btn {
  white-space: nowrap;
}

.pal-config-section {
  border: 1px solid var(--accent);
  border-radius: 8px;
  background: color-mix(in srgb, var(--accent) 4%, transparent);
  overflow: hidden;
}

.pal-card-config-section {
  border: 1px solid color-mix(in srgb, var(--accent) 30%, transparent);
  border-radius: 6px;
  background: rgba(0, 0, 0, 0.3);
  padding: 12px;
}

.pal-card-config-header {
  font-weight: 600;
  font-size: 14px;
  color: var(--accent);
  margin-bottom: 12px;
  display: flex;
  align-items: center;
}

.pal-card-config-header i {
  margin-right: 8px;
}

.pal-card-config-content {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.config-row {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.config-label {
  font-size: 13px;
  font-weight: 500;
  color: var(--text);
  margin-bottom: 4px;
}

.pal-config-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: var(--surface-2);
  border-bottom: 1px solid var(--accent);
  cursor: pointer;
  transition: all 0.2s ease;
}

.pal-config-header:hover {
  background: color-mix(in srgb, var(--accent) 12%, transparent);
}

.pal-config-title {
  font-weight: 600;
  font-size: 14px;
  display: flex;
  align-items: center;
  color: var(--text);
}

.pal-config-title i {
  margin-right: 8px;
  color: var(--accent);
}

.pal-config-toggle {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--accent);
}

.pal-config-content {
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.pal-card-item {
  border: 1px solid color-mix(in srgb, var(--accent) 30%, transparent);
  border-radius: 6px;
  background: var(--surface-2);
  padding: 10px;
  overflow: hidden;
}

.pal-card-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
  padding-bottom: 8px;
  border-bottom: 1px solid color-mix(in srgb, var(--accent) 20%, transparent);
}

.pal-card-checkbox {
  display: flex;
  align-items: center;
}

.pal-checkbox {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  background: transparent;
  border: 1px solid var(--accent);
  color: white;
  cursor: pointer;
  border-radius: 3px;
  transition: all 0.2s ease;
  padding: 0;
}

.pal-checkbox:hover {
  background: color-mix(in srgb, var(--accent) 10%, transparent);
}

.pal-checkbox.checked {
  background-color: var(--accent);
  border-color: var(--accent);
}

.pal-checkbox i {
  font-size: 14px;
}

.pal-card-name {
  font-weight: 600;
  font-size: 13px;
  color: var(--text);
  flex: 1;
}

.pal-stages-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.pal-stage-row {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.stage-label {
  color: var(--accent);
  font-weight: 700;
  text-transform: uppercase;
  flex: 0 0 80px;
}

.stage-inputs {
  display: flex;
  flex: 1;
  gap: 1rem;
}

.stage-inputs .input-group {
  flex: 1;
  border: 1px solid var(--accent);
  border-radius: 0.25rem;
  overflow: hidden;
  display: flex;
}

.stage-inputs .input-group .form-control {
  background-color: transparent;
  color: #fff;
  border: none;
  min-width: 0;
}

.stage-inputs .input-group .input-group-text {
  color: var(--accent);
  background-color: transparent;
  border: none;
}

.input-group-text {
  background-color: var(--surface);
  border-color: var(--accent);
  color: var(--accent);
}

</style>

<script lang="ts">
import SkillIcon from './SkillIcon.vue';
import AoharuConfigModal from './AoharuConfigModal.vue';
import UraConfigModal from './UraConfigModal.vue';
import SupportCardSelectModal from './SupportCardSelectModal.vue';
import characterData from '../assets/uma_character_data.json';
import raceData from '../assets/uma_race_data.json';
import skillsData from '../assets/umamusume_final_skills_fixed.json';
import eventNames, { eventOptionCounts } from 'virtual:events';
import { encodePreset, decodePreset } from '../util/presetCodec.js';
import { createScoringDefaults } from '../shared/scoringDefaults';
import { buildScoringPayloadFromVm, applyScoringSourceToVm } from '../shared/scoringMapper';
import {
  createEventWeightDefaults,
  buildEventWeightsPayloadFromVm,
  applyEventWeightsSourceToVm,
} from '../shared/eventWeightsMapper';
import {
  buildTaskSkillPayloadFromVm,
  parseSkillSelectionFromSource,
  applySkillSelectionStateToVm,
} from '../shared/skillSelectionMapper';
import {
  getSortedPriorities,
  getHighestPriority,
  getSkillsForPriority,
  selectSkillsAtPriority,
  blacklistSkills,
  clearSelectedSkills,
  unblacklistSkills,
  deselectSkillEverywhere,
  toggleSkillSelection,
  toggleSkillBlacklist,
  addPriorityLevel,
  removeLastPriorityLevel,
  clearPrioritySelection,
} from '../shared/skillAssignmentUtils';
import {
  buildTaskScenarioConfigPayloadFromVm,
  applyScenarioConfigSourceToVm,
} from '../shared/scenarioConfigMapper';
import {
  buildEventChoicesPayloadFromSelection,
  applyEventChoicesSourceToVm,
} from '../shared/eventChoicesMapper';
import {
  buildTaskPalConfigPayloadFromVm,
  applyPresetPalConfigSourceToVm,
  applyTaskPalConfigSourceToVm,
} from '../shared/palConfigMapper';
import { buildPresetPayloadFromVm } from '../shared/presetMapper';
import { applyTaskFormStateFromSource } from '../shared/taskFormStateMapper';
import { filterRacesForUi, isRaceCompatibleWithCharacter } from '../shared/raceFilterUtils';
import {
  fetchCultivatePresets,
  saveCultivatePreset,
  deleteCultivatePreset,
} from '../shared/presetApi';

export default {
  name: "TaskEditModal",
  components: {
    SkillIcon,
    AoharuConfigModal,
    UraConfigModal,
    SupportCardSelectModal
  },
  created() {
    if (typeof this.loadEventList === 'function') {
      this.loadEventList();
    }
        this.mantItemTiers = this.mantGetDefaultTiers();
        this.mantTierCount = 2;
  },
  data: function () {
    const scoringDefaults = createScoringDefaults();
    const eventWeightDefaults = createEventWeightDefaults();
    return {
      sectionList: [
        { id: 'category-general', label: 'General' },
        { id: 'category-decision-docs', label: 'Decision Docs' },
        { id: 'category-preset', label: 'Preset & Support' },
        { id: 'category-career', label: 'Career' },
        { id: 'category-race', label: 'Race' },
        { id: 'category-skill', label: 'Skills' },
        { id: 'category-event', label: 'Events' }
      ],
      activeSection: 'category-general',
      isEditMode: false,
      editingTaskId: null,
      editingTaskStatus: null,
      isSavingTask: false,
      isSavingPreset: false,
      modalHiddenHandler: null,
      manualPurchase: false,
      skipDoubleCircleUnlessHighHint: false,
      overrideInsufficientFansForcedRaces: false,
      showAdvanceOption: false,
      showRaceList: false,
      dataReady: false,
      // Race filtering properties
      raceSearch: '',
      showGI: true,
      showGII: true,
      showGIII: true,
      showOP: true,
      showPREOP: true,
      showTurf: true,
      showDirt: true,
      showSprint: true,
      showMile: true,
      showMedium: true,
      showLong: true,
      // Character filter properties
      selectedCharacter: '',
      characterList: [],
      characterTrainingPeriods: {},
      showCharacterChangeModal: false,
      fujikisekiShowMode: false,
      fujikisekiShowDifficulty: 1,
      // MANT item selection
      mantDragOverTier: null,
      mantDragItemId: null,
      mantTierCount: 2,
      mantItemIds: [
        'speedsmall','speedmedium','speedlarge',
        'staminasmall','staminamedium','staminalarge',
        'powersmall','powermedium','powerlarge',
        'gutssmall','gutsmedium','gutslarge',
        'witsmall','witmedium','witlarge',
        'energydrinksmall','energydrinkmedium','energydrinklarge',
        'greenjuice','maxsmall','maxlarge','moodsmall','moodlarge',
        'catfood','bbq',
        'mirror','binoc','ppbook','hat',
        'pillow','scheduler','handcream','scale','aroma','useless2','cureall',
        'speedpet','staminapet','powerpet','gutspet','witpet','shuffle',
        'megasmall','megamedium','megalarge',
        'speedweights','staminaweights','powerweights','gutsweights','prayer',
        'rb','rbex','penlight',
      ],
      mantItemTiers: {},
      mantWhistleThreshold: 20,
      mantWhistleFocusSummer: true,
      mantMegaSmallThreshold: 60,
      mantMegaMediumThreshold: 70,
      mantMegaLargeThreshold: 80,
      mantTrainingWeightsThreshold: 60,
      levelDataList: [],
      umamusumeTaskTypeList: [
        {
          id: 1,
          name: "Training",
        }
      ],
      umamusumeList: [
        { id: 1, name: 'Special Week' },
        { id: 2, name: 'Silence Suzuka' },
        { id: 3, name: 'Tokai Teio' },
        { id: 4, name: 'Maruzensky' },
        { id: 5, name: 'Oguri Cap' },
        { id: 6, name: 'Taiki Shuttle' },
        { id: 7, name: 'Mejiro Mcqueen' },
        { id: 8, name: 'TM Opera O' },
        { id: 9, name: 'Symboli Rudolf' },
        { id: 10, name: 'Rice Shower' },
        { id: 11, name: 'Gold Ship' },
        { id: 12, name: 'Vodka' },
        { id: 13, name: 'Daiwa Scarlet' },
        { id: 14, name: 'Glass Wonder' },
        { id: 15, name: 'El Condor Pasa' },
        { id: 16, name: 'Air Groove' },
        { id: 17, name: 'Mayano Top Gun' },
        { id: 18, name: 'Super Creek' },
        { id: 19, name: 'Mejiro Ryan' },
        { id: 20, name: 'Agnes Tachyon' },
        { id: 21, name: 'Winning Ticket' },
        { id: 22, name: 'Sakura Bakushin O' },
        { id: 23, name: 'Haru Urara' },
        { id: 24, name: 'Matikanefukukitaru' },
        { id: 25, name: 'Nice Nature' },
        { id: 26, name: 'King Halo' }],
      // Race data from JSON file
      umamusumeRaceList_1: [],
      umamusumeRaceList_2: [],
      umamusumeRaceList_3: [],
      cultivatePresets: [],
      expectSpeedValue: 9999,
      expectStaminaValue: 9999,
      expectPowerValue: 9999,
      expectWillValue: 9999,
      expectIntelligenceValue: 9999,

      supportCardLevel: 50,

      presetsUse: {
        name: "Basic Career Preset",
        race_list: [],
        skill: "",
        skill_priority_list: [],
        skill_blacklist: "",
        expect_attribute: [9999, 9999, 9999, 9999, 9999],
        follow_support_card: { id: 10001, name: 'Beyond This Shining Moment', desc: 'Silence Suzuka' },
        follow_support_card_level: 50,
        clock_use_limit: 99,
        learn_skill_threshold: 888,
        race_tactic_1: 4,
        race_tactic_2: 4,
        race_tactic_3: 4,
        tactic_actions: [],
        extraWeight: [],
      },
      // ===  已选择  ===
      selectedExecuteMode: 3,
      expectTimes: 0,
      cron: "* * * * *",

      selectedScenario: 1,
      selectedUmamusumeTaskType: undefined,
      selectedSupportCard: undefined,
      extraRace: [],
      learnSkillOnlyUserProvided: false,
      selectedRaceTactic1: 4,
      selectedRaceTactic2: 4,
      selectedRaceTactic3: 4,
      clockUseLimit: 99,
      restTreshold: 48,
      compensateFailure: true,
      failureRateDivisor: 50,
      summerScoreThreshold: scoringDefaults.summerScoreThreshold,
      witRaceSearchThreshold: scoringDefaults.witRaceSearchThreshold,
      learnSkillThreshold: 888,
      cureAsapConditions: 'Migraine,Night Owl,Skin Outbreak,Slacker,Slow Metabolism,(Practice poor isn\'t worth a turn to cure)',
      recoverTP: 0,
      useLastParents: false,
      presetNameEdit: "",
      presetAction: null,
      overwritePresetName: "",
      deletePresetName: "",
      successToast: undefined,
      extraWeight1: [0, 0, 0, 0, 0],
      extraWeight2: [0, 0, 0, 0, 0],
      extraWeight3: [0, 0, 0, 0, 0],
      extraWeightSummer: [0, 0, 0, 0, 0],
      baseScore: scoringDefaults.baseScore,
      spiritExplosionJunior: scoringDefaults.spiritExplosionJunior,
      spiritExplosionClassic: scoringDefaults.spiritExplosionClassic,
      spiritExplosionSenior: scoringDefaults.spiritExplosionSenior,
      spiritExplosionSeniorAfterSummer: scoringDefaults.spiritExplosionSeniorAfterSummer,
      spiritExplosionFinale: scoringDefaults.spiritExplosionFinale,

      // Motivation thresholds for trip decisions
      motivationThresholdYear1: 3,
      motivationThresholdYear2: 4,
      motivationThresholdYear3: 4,
      prioritizeRecreation: false,
      showPalConfigPanel: true,
      palCardStore: {},
      palSelected: "",
      // Pal card scoring configuration
      palFriendshipScore: scoringDefaults.palFriendshipScore,
      palCardMultiplier: scoringDefaults.palCardMultiplier,
      hintBoostCharacters: [],
      hintBoostMultiplier: 100,
      hintBoostSearch: '',
      showHintBoostPanel: false,
      friendshipScoreGroups: [
        { characters: [], multiplier: 100, search: '', expanded: false },
        { characters: [], multiplier: 100, search: '', expanded: false }
      ],
      allTrainingCharacters: [],
      npcWeight: scoringDefaults.npcWeight,

      // URA配置
      skillEventWeight: [0, 0, 0],
      resetSkillEventWeightList: '',

      // 青春杯配置
      preliminaryRoundSelections: [2, 1, 1, 1],
      aoharuTeamNameSelection: 4,
      showAoharuConfigModal: false,
      showUraConfigModal: false,
      showSupportCardSelectModal: false,

      // Skill data from JSON file
      skillPriority0: [],
      skillPriority1: [],
      skillPriority2: [],
      selectedSkills: [],
      blacklistedSkills: [],
      // New properties for dynamic priority system
      activePriorities: [0], // Start with Priority 0
      skillAssignments: {}, // Track which skills are assigned to which priority
      skillFilter: {
        strategy: '',
        distance: '',
        tier: '',
        rarity: '',
        query: ''
      },
      availableStrategies: ['', 'Front Runner', 'Pace Chaser', 'Late Surger', 'End Closer'],
      availableDistances: ['', 'Sprint', 'Mile', 'Medium', 'Long'],
      availableTiers: ['', 'SS', 'S', 'A', 'B', 'C', 'D'],
      availableRarities: ['', 'Unique', 'Rare', 'Normal'],
      showSkillList: false
      , showPresetMenu: false,
      sharePresetText: '',

            draggingSkillName: null,
      dragOrigin: null,
      
      eventWeightsJunior: eventWeightDefaults.junior,
      eventWeightsClassic: eventWeightDefaults.classic,
      eventWeightsSenior: eventWeightDefaults.senior,
      dropHoverTarget: null,
      didValidDrop: false,

      // Event list UI
      showEventList: false,
      eventQuery: '',
      eventList: [],
      eventChoicesSelected: {},

      scoreValueJunior: scoringDefaults.scoreValueJunior,
      scoreValueClassic: scoringDefaults.scoreValueClassic,
      scoreValueSenior: scoringDefaults.scoreValueSenior,
      scoreValueSeniorAfterSummer: scoringDefaults.scoreValueSeniorAfterSummer,
      scoreValueFinale: scoringDefaults.scoreValueFinale,
      friendshipGreenDiscount: scoringDefaults.friendshipGreenDiscount,
      statCapPenalties: scoringDefaults.statCapPenalties,
      scoringVersion: scoringDefaults.scoringVersion,
      specialJunior: scoringDefaults.specialJunior,
      specialClassic: scoringDefaults.specialClassic,
      specialSenior: scoringDefaults.specialSenior,
      specialSeniorAfterSummer: scoringDefaults.specialSeniorAfterSummer,
      specialFinale: scoringDefaults.specialFinale,
      witSpecialJunior: scoringDefaults.witSpecialJunior,
      witSpecialClassic: scoringDefaults.witSpecialClassic,
      // Stat Value Multiplier [speed, stamina, power, guts, wits, sp]
      statValueMultiplier: scoringDefaults.statValueMultiplier,
      raceTacticConditions: [
        { op: 'range', val: 0, val2: 25, tactic: 3 },
        { op: 'range', val: 24, val2: 49, tactic: 3 },
        { op: '>', val: 48, val2: 0, tactic: 3 }
      ],
      showTurnInfo: false,
          }
  },
  computed: {
    modalTitle() {
      return this.isEditMode ? 'Edit Task' : 'Create New Task';
    },
    submitLabel() {
      if (this.isSavingTask) return this.isEditMode ? 'Saving...' : 'Creating...';
      return this.isEditMode ? 'Save Changes' : 'Confirm';
    },
    isEditingRunningTask() {
      return this.isEditMode && this.normalizeTaskStatus(this.editingTaskStatus) === 2;
    },
    mantCanRemoveTier() {
      return this.mantTierCount > 1;
    },
    filteredHintCharacters() {
      if (!this.hintBoostSearch) return this.allTrainingCharacters;
      const q = this.hintBoostSearch.toLowerCase();
      return this.allTrainingCharacters.filter(n => n.toLowerCase().includes(q));
    },
    raceFilterState() {
      return {
        raceSearch: this.raceSearch,
        showGI: this.showGI,
        showGII: this.showGII,
        showGIII: this.showGIII,
        showOP: this.showOP,
        showPREOP: this.showPREOP,
        showTurf: this.showTurf,
        showDirt: this.showDirt,
        showSprint: this.showSprint,
        showMile: this.showMile,
        showMedium: this.showMedium,
        showLong: this.showLong,
        selectedCharacter: this.selectedCharacter,
        characterList: this.characterList,
        characterTrainingPeriods: this.characterTrainingPeriods,
      };
    },
    filteredRaces_1() {
      return filterRacesForUi(this.umamusumeRaceList_1, this.raceFilterState);
    },
    filteredRaces_2() {
      return filterRacesForUi(this.umamusumeRaceList_2, this.raceFilterState);
    },
    filteredRaces_3() {
      return filterRacesForUi(this.umamusumeRaceList_3, this.raceFilterState);
    },
    // Group skills by skill_type within each priority
    skillsByTypePriority0() {
      const grouped = {};
      this.skillPriority0.forEach(skill => {
        if (!grouped[skill.skill_type]) {
          grouped[skill.skill_type] = [];
        }
        grouped[skill.skill_type].push(skill);
      });
      return grouped;
    },
    skillsByTypePriority1() {
      const grouped = {};
      this.skillPriority1.forEach(skill => {
        if (!grouped[skill.skill_type]) {
          grouped[skill.skill_type] = [];
        }
        grouped[skill.skill_type].push(skill);
      });
      return grouped;
    },
    skillsByTypePriority2() {
      const grouped = {};
      this.skillPriority2.forEach(skill => {
        if (!grouped[skill.skill_type]) {
          grouped[skill.skill_type] = [];
        }
        grouped[skill.skill_type].push(skill);
      });
      return grouped;
    },
    // New computed property for all skills grouped by type
    allSkillsByType() {
      const allSkills = skillsData;
      const grouped = {};
      allSkills.forEach(skill => {
        if (!grouped[skill.skill_type]) {
          grouped[skill.skill_type] = [];
        }
        grouped[skill.skill_type].push(skill);
      });
      return grouped;
    },
    filteredSkillsByType() {
      const { strategy, distance, tier, rarity, query } = this.skillFilter;
      const allSkills = skillsData;

      // Filter skills based on selected criteria
      const filteredSkills = allSkills.filter(skill => {
        const matchesStrategy = !strategy || (skill.strategy && skill.strategy === strategy);
        const matchesDistance = !distance || (skill.distance && skill.distance === distance);
        const matchesTier = !tier || (skill.tier && skill.tier === tier);
        const matchesRarity = !rarity || (skill.rarity && skill.rarity === rarity);
        const q = (query || '').toLowerCase();
        const matchesQuery = !q ||
          (skill.name && skill.name.toLowerCase().includes(q)) ||
          (skill.description && skill.description.toLowerCase().includes(q));
        return matchesStrategy && matchesDistance && matchesTier && matchesRarity && matchesQuery;
      });

      // Group filtered skills by type
      const grouped = {};
      filteredSkills.forEach(skill => {
        if (!grouped[skill.skill_type]) {
          grouped[skill.skill_type] = [];
        }
        grouped[skill.skill_type].push(skill);
      });

      return grouped;
    },
    turnReferenceColumns() {
      const columns = [[], [], [], [], [], []];
      const years = ["Junior", "Classic", "Senior"];
      const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      const halves = ["Early", "Late"];

      for (let turn = 12; turn <= 77; turn++) {
        let desc = "";
        
        if (turn === 12) {
           desc = "Debut";
        } else if (turn <= 72) {
          // Calculation based on Turn 1 = Junior Jan Early (index 0)
          // 0: Jan E, 1: Jan L
          const absIndex = turn - 1; 
          
          const yearIdx = Math.floor(absIndex / 24);
          const monthIdx = Math.floor((absIndex % 24) / 2);
          const halfIdx = absIndex % 2;

          if (yearIdx < years.length) {
            desc = `${years[yearIdx]} ${halves[halfIdx]} ${months[monthIdx]}`;
          } else {
             desc = "Unknown";
          }
        } else {
          // Special URA handling
          if (turn === 73) desc = "URA Qualifiers";
          else if (turn === 74) desc = "Training";
          else if (turn === 75) desc = "URA Semis";
          else if (turn === 76) desc = "Training";
          else if (turn === 77) desc = "URA Finals";
          else desc = "Post-Game";
        }

        // Distribute into 6 columns (66 turns total / 6 cols = 11 rows/col)
        const colIdx = Math.floor((turn - 12) / 11);
        if (colIdx < 6) {
          columns[colIdx].push({ turn, desc });
        }
      }
      return columns;
    }
  },
  mounted() {
    window.addEventListener('dragend', this.onGlobalDragEnd, false);
    window.addEventListener('drop', this.onGlobalDrop, false);
    this.loadCharacterData()
    this.loadEventList()
    this.loadRaceData()
    this.loadSkillData()
    this.loadTrainingCharacters()
    this.initSelect()
    this.getPresets()
    this.loadPalCardStore()
    this.successToast = $('#liveToast').toast({})
    this.modalHiddenHandler = () => {
      this.isSavingTask = false;
      this.isSavingPreset = false;
      this.showPresetMenu = false;
      this.resetEditContext();
    };
    $('#create-task-list-modal').on('hidden.bs.modal', this.modalHiddenHandler);
    this.$nextTick(() => {
      this.initScrollSpy()
      this.normalizeScoreArrays(3)
    })
  },
  beforeUnmount() {
    window.removeEventListener('dragend', this.onGlobalDragEnd, false);
    window.removeEventListener('drop', this.onGlobalDrop, false);
    if (this.modalHiddenHandler) {
      $('#create-task-list-modal').off('hidden.bs.modal', this.modalHiddenHandler);
      this.modalHiddenHandler = null;
    }
  },
  watch: {
    selectedScenario(newVal) {
      this.normalizeScoreArrays(3)
    },
    scoreValueJunior(val) {
      if (val.length < 3) this.scoreValueJunior = [...val, ...Array(3 - val.length).fill(0)]
    },
    scoreValueClassic(val) {
      if (val.length < 3) this.scoreValueClassic = [...val, ...Array(3 - val.length).fill(0)]
    },
    scoreValueSenior(val) {
      if (val.length < 3) this.scoreValueSenior = [...val, ...Array(3 - val.length).fill(0)]
    },
    scoreValueSeniorAfterSummer(val) {
      if (val.length < 3) this.scoreValueSeniorAfterSummer = [...val, ...Array(3 - val.length).fill(0)]
    },
    scoreValueFinale(val) {
      if (val.length < 3) this.scoreValueFinale = [...val, ...Array(3 - val.length).fill(0)]
    }
  },
    methods: {
    getTurnFromDate(dateStr) {
      if (!dateStr) return '?';
      let y = 0, m = 0, h = 0;
      if (dateStr.includes('Classic')) y = 1;
      else if (dateStr.includes('Senior')) y = 2;
      
      // Avoid matching "Jun" in "Junior" by removing "Junior" before checking months
      const monthCheckStr = dateStr.replace('Junior', '');
      
      const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      for (let i = 0; i < months.length; i++) {
        if (monthCheckStr.includes(months[i])) {
          m = i;
          break;
        }
      }
      
      if (dateStr.includes('Late')) h = 1;
      
      return (y * 24) + (m * 2) + h + 1;
    },
    normalizeTaskStatus(status) {
      if (status === null || status === undefined) return null;
      if (typeof status === 'number') return status;
      if (typeof status === 'string') {
        const parsed = Number(status);
        if (!Number.isNaN(parsed)) return parsed;
        const byName = {
          TASK_STATUS_PENDING: 1,
          TASK_STATUS_RUNNING: 2,
          TASK_STATUS_INTERRUPT: 3,
          TASK_STATUS_SUCCESS: 4,
          TASK_STATUS_FAILED: 5,
          TASK_STATUS_SCHEDULED: 6,
          TASK_STATUS_CANCELED: 7
        };
        return byName[status] !== undefined ? byName[status] : null;
      }
      if (typeof status === 'object') {
        if (status.value !== undefined) return this.normalizeTaskStatus(status.value);
        if (status.name !== undefined) return this.normalizeTaskStatus(status.name);
      }
      return null;
    },
    resetEditContext() {
      this.isEditMode = false;
      this.editingTaskId = null;
      this.editingTaskStatus = null;
    },
    taskSaveSuccessMessage(responseData) {
      if (!this.isEditMode) {
        return "Task created successfully";
      }
      if (responseData && responseData.running_limited) {
        if (responseData.live_applied) {
          return "Running task updated and applied live (safe settings)";
        }
        return "Running task updated. Safe settings will apply at runtime boundaries.";
      }
      return "Task updated successfully";
    },
    showToast(message) {
      const toastBody = document.querySelector('#liveToast .toast-body');
      if (toastBody) toastBody.textContent = message;
      if (this.successToast) this.successToast.toast('show');
    },
    handleImageLoadError(event: Event) {
      const target = event.target as HTMLElement | null;
      if (target) target.style.display = 'none';
    },
    extractApiError(err, fallbackMessage) {
      const detail = err?.response?.data?.detail;
      if (typeof detail === 'string' && detail.trim().length > 0) {
        return detail;
      }
      return fallbackMessage;
    },
    loadPalCardStore() {
      this.axios.get('/api/pal-defaults', null, false)
        .then(res => {
          if (res && res.data) {
            this.palCardStore = res.data;
            const palNames = Object.keys(this.palCardStore);
            if (palNames.length > 0 && !this.palSelected) {
              this.palSelected = palNames[0];
            }
          }
        })
        .catch(() => {});
    },
    resetEventWeights() {
      const defaults = createEventWeightDefaults();
      this.eventWeightsJunior = defaults.junior;
      this.eventWeightsClassic = defaults.classic;
      this.eventWeightsSenior = defaults.senior;
    },
    togglePalConfigPanel() {
    this.showPalConfigPanel = !this.showPalConfigPanel;
    },
    togglePalCardSelection(palName) {
    if (this.palSelected === palName) {
    if (!this.prioritizeRecreation) {
      this.palSelected = null;
    }
    } else {
    this.palSelected = palName;
    }
    },
    currentSkillState() {
      return {
        selectedSkills: this.selectedSkills,
        blacklistedSkills: this.blacklistedSkills,
        skillAssignments: this.skillAssignments,
        activePriorities: this.activePriorities,
      };
    },
    applySkillState(state) {
      this.selectedSkills = state.selectedSkills;
      this.blacklistedSkills = state.blacklistedSkills;
      this.skillAssignments = state.skillAssignments;
      this.activePriorities = state.activePriorities;
    },
    getFilteredNames() {
      const names = [];
      Object.keys(this.filteredSkillsByType).forEach(type => {
        (this.filteredSkillsByType[type] || []).forEach(s => names.push(s.name));
      });
      return names;
    },
    onSelectAllFiltered() {
      this.applySkillState(
        selectSkillsAtPriority(
          this.currentSkillState(),
          this.getFilteredNames(),
          getHighestPriority(this.activePriorities),
        ),
      );
    },
    onBlacklistAllFiltered() {
      this.applySkillState(
        blacklistSkills(this.currentSkillState(), this.getFilteredNames()),
      );
    },
    onClearAllFiltered() {
      this.applySkillState(
        clearSelectedSkills(this.currentSkillState(), this.getFilteredNames()),
      );
    },
    onUnblacklistAllFiltered() {
      this.applySkillState(
        unblacklistSkills(this.currentSkillState(), this.getFilteredNames()),
      );
    },
    selectAllFilteredToCurrentPriority() {
      this.applySkillState(
        selectSkillsAtPriority(
          this.currentSkillState(),
          this.getFilteredNames(),
          getHighestPriority(this.activePriorities),
        ),
      );
    },
    blacklistAllFiltered() {
      this.applySkillState(
        blacklistSkills(this.currentSkillState(), this.getFilteredNames()),
      );
    },
    clearCurrentPriority() {
      this.applySkillState(
        clearPrioritySelection(
          this.currentSkillState(),
          getHighestPriority(this.activePriorities),
        ),
      );
    },
    clearBlacklist() {
      this.applySkillState(
        unblacklistSkills(this.currentSkillState(), this.blacklistedSkills),
      );
    },
    onDragStartSkill(skillName, origin, originPriority = null) {
      this.draggingSkillName = skillName;
      this.dragOrigin = { type: origin, priority: originPriority };
      this.didValidDrop = false;
    },
    onDragEndSkill() {
      if (this.draggingSkillName) {
        if (!this.didValidDrop) {
          this.deselectSkill(this.draggingSkillName);
        }
        this.draggingSkillName = null;
        this.dropHoverTarget = null;
        this.didValidDrop = false;
        this.dragOrigin = null;
      }
    },
    onDragEnterPriority(priority) {
      this.dropHoverTarget = { type: 'priority', priority };
    },
    onDragLeavePriority(priority) {
      if (this.dropHoverTarget && this.dropHoverTarget.type === 'priority' && this.dropHoverTarget.priority === priority) {
        this.dropHoverTarget = null;
      }
    },
    onDropToPriority(priority) {
      if (!this.draggingSkillName) return;
      this.moveSkillToPriority(this.draggingSkillName, priority);
      this.didValidDrop = true;
      this.dropHoverTarget = null;
      this.draggingSkillName = null;
    },
    onDragEnterBlacklist() {
      this.dropHoverTarget = { type: 'blacklist' };
    },
    onDragLeaveBlacklist() {
      if (this.dropHoverTarget && this.dropHoverTarget.type === 'blacklist') {
        this.dropHoverTarget = null;
      }
    },
    onDropToBlacklist() {
      if (!this.draggingSkillName) return;
      this.moveSkillToBlacklist(this.draggingSkillName);
      this.didValidDrop = true;
      this.dropHoverTarget = null;
      this.draggingSkillName = null;
    },
    onGlobalDrop(e) {
      if (this.draggingSkillName && !this.didValidDrop) {
        this.deselectSkill(this.draggingSkillName);
        this.draggingSkillName = null;
      }
    },
    onGlobalDragEnd(e) {
      if (this.draggingSkillName && !this.didValidDrop) {
        this.deselectSkill(this.draggingSkillName);
        this.draggingSkillName = null;
      }
    },
    moveSkillToPriority(skillName, priority) {
      this.applySkillState(
        selectSkillsAtPriority(this.currentSkillState(), [skillName], priority),
      );
    },
    moveSkillToBlacklist(skillName) {
      this.applySkillState(
        blacklistSkills(this.currentSkillState(), [skillName]),
      );
    },
    deselectSkill(skillName) {
      this.applySkillState(
        deselectSkillEverywhere(this.currentSkillState(), skillName),
      );
    },
      // Event Settings
      toggleEventList() {
        this.showEventList = !this.showEventList;
        if (this.showEventList && this.eventList.length === 0) {
          this.loadEventList();
        }
      },
      // Event option helpers
      getEventOptionCount(name) {
        return eventOptionCounts && typeof eventOptionCounts === 'object' ? (eventOptionCounts[name] || 0) : 0;
      },
      isEventChoiceSelected(name, n) {
        return this.eventChoicesSelected && this.eventChoicesSelected[name] === n;
      },
      onEventChoiceClick(name, n) {
        const cur = this.eventChoicesSelected[name];
        if (cur === n) {
          // deselect
          try { delete this.eventChoicesSelected[name]; } catch (e) { this.eventChoicesSelected[name] = undefined; }
        } else {
          // select only this one
          this.eventChoicesSelected[name] = n;
        }
      },
      loadEventList() {
        try {
          this.eventList = Array.isArray(eventNames) ? eventNames : [];
        } catch (e) {
          this.eventList = [];
        }
      },
      eventListFiltered() {
        const q = (this.eventQuery || '').toLowerCase();
        if (!q) return this.eventList;
        return this.eventList.filter(name => name && name.toLowerCase().includes(q));
      },
        normalizeScoreArrays(targetLen) {
      const ensureLen = (arr) => {
        if (arr.length > targetLen) arr.splice(targetLen)
        while (arr.length < targetLen) arr.push(0)
      }
      ensureLen(this.scoreValueJunior)
      ensureLen(this.scoreValueClassic)
      ensureLen(this.scoreValueSenior)
      ensureLen(this.scoreValueSeniorAfterSummer)
      ensureLen(this.scoreValueFinale)
    },
    togglePresetMenu() {
      if (this.isSavingPreset) return;
      this.showPresetMenu = !this.showPresetMenu;
    },
    selectPresetAction(which) {
      this.togglePresetAction(which);
      this.showPresetMenu = false;
    },
    loadCharacterData: function () {
      this.characterList = characterData.map(char => ({
        name: char.character_name,
        terrain: char.aptitude.terrain,
        distance: char.aptitude.distance
      }));
      this.characterTrainingPeriods = {};
      characterData.forEach(char => {
        this.characterTrainingPeriods[char.character_name] = {
          'Junior Year': char.objectives.junior_year.dates.map(date => `Junior Year ${date.replace('Junior ', '')}`),
          'Classic Year': char.objectives.classic_year.dates.map(date => `Classic Year ${date.replace('Classic ', '')}`),
          'Senior Year': char.objectives.senior_year.dates.map(date => `Senior Year ${date.replace('Senior ', '')}`)
        };
      });
    },
    loadRaceData: function () {
      // Split races by year based on date
      const juniorRaces = raceData.races.filter(race => race.date.includes('Junior Year'));
      const classicRaces = raceData.races.filter(race => race.date.includes('Classic Year'));
      const seniorRaces = raceData.races.filter(race => race.date.includes('Senior Year'));

      this.umamusumeRaceList_1 = juniorRaces;
      this.umamusumeRaceList_2 = classicRaces;
      this.umamusumeRaceList_3 = seniorRaces;
    },
    loadSkillData: function () {
      // Load all skills from JSON and organize by priority/tier
      const allSkills = skillsData;

      // Organize skills by tier/priority - store full skill objects
      this.skillPriority0 = allSkills.filter(skill => skill.tier === 'SS');
      this.skillPriority1 = allSkills.filter(skill => skill.tier === 'S');
      this.skillPriority2 = allSkills.filter(skill => skill.tier === 'A');
    },
    loadTrainingCharacters() {
      this.axios.get("/api/training-characters").then(res => {
        this.allTrainingCharacters = res.data || [];
      }).catch(() => {
        this.allTrainingCharacters = [];
      });
    },
    toggleHintBoostCharacter(name) {
      const idx = this.hintBoostCharacters.indexOf(name);
      if (idx >= 0) {
        this.hintBoostCharacters.splice(idx, 1);
      } else {
        this.hintBoostCharacters.push(name);
      }
    },
    toggleFsgCharacter(groupIdx, name) {
      const group = this.friendshipScoreGroups[groupIdx];
      const idx = group.characters.indexOf(name);
      if (idx >= 0) {
        group.characters.splice(idx, 1);
      } else {
        group.characters.push(name);
      }
    },
    filteredFsgCharacters(groupIdx) {
      const group = this.friendshipScoreGroups[groupIdx];
      if (!group.search) return this.allTrainingCharacters;
      const q = group.search.toLowerCase();
      return this.allTrainingCharacters.filter(n => n.toLowerCase().includes(q));
    },
    initSelect: function () {
      this.selectedSupportCard = { id: 10001, name: 'Beyond This Shining Moment', desc: 'Silence Suzuka' }
      this.selectedUmamusumeTaskType = this.umamusumeTaskTypeList[0]
    },
    switchRaceList: function () {
      this.showRaceList = !this.showRaceList
    },
    // Helper: check whether a race matches the currently selected character's aptitude and schedule
    isRaceCompatibleWithSelectedCharacter(race) {
      return isRaceCompatibleWithCharacter(
        race,
        this.selectedCharacter,
        this.characterList,
        this.characterTrainingPeriods,
      )
    },
    // Quick selection methods
    selectAllGI: function () {
      const pool = [
        ...this.umamusumeRaceList_1,
        ...this.umamusumeRaceList_2,
        ...this.umamusumeRaceList_3
      ].filter(race => race.type === 'G1')
        .filter(race => this.isRaceCompatibleWithSelectedCharacter(race))
      pool.forEach(race => { if (!this.extraRace.includes(race.id)) this.extraRace.push(race.id) })
    },
    selectAllGII: function () {
      const pool = [
        ...this.umamusumeRaceList_1,
        ...this.umamusumeRaceList_2,
        ...this.umamusumeRaceList_3
      ].filter(race => race.type === 'G2')
        .filter(race => this.isRaceCompatibleWithSelectedCharacter(race))
      pool.forEach(race => { if (!this.extraRace.includes(race.id)) this.extraRace.push(race.id) })
    },
    selectAllGIII: function () {
      const pool = [
        ...this.umamusumeRaceList_1,
        ...this.umamusumeRaceList_2,
        ...this.umamusumeRaceList_3
      ].filter(race => race.type === 'G3')
        .filter(race => this.isRaceCompatibleWithSelectedCharacter(race))
      pool.forEach(race => { if (!this.extraRace.includes(race.id)) this.extraRace.push(race.id) })
    },
    clearAllRaces: function () {
      this.extraRace = [];
    },
    onCharacterChange: function () {
      // Smart filtering: Show custom confirmation modal when character changes
      if (this.extraRace.length > 0) {
        this.showCharacterChangeModal = true;
      }
    },

    getCompatibleRacesCount: function () {
      if (!this.selectedCharacter) return 0;

      let count = 0;
      // Count compatible races from all three race lists
      [this.filteredRaces_1, this.filteredRaces_2, this.filteredRaces_3].forEach(races => {
        if (races) count += races.length;
      });

      return count;
    },

    getIncompatibleRacesCount: function () {
      if (!this.selectedCharacter) return 0;

      let totalRaces = 0;
      let compatibleRaces = 0;

      // Count total races from all three race lists
      [this.umamusumeRaceList_1, this.umamusumeRaceList_2, this.umamusumeRaceList_3].forEach(races => {
        if (races) totalRaces += races.length;
      });

      compatibleRaces = this.getCompatibleRacesCount();
      return totalRaces - compatibleRaces;
    },

    // Character change modal methods
    closeCharacterChangeModal: function () {
      this.showCharacterChangeModal = false;
    },

    handleClearSelection: function () {
      // Clear the entire selection
      this.extraRace = [];
      this.closeCharacterChangeModal();
    },

    handleFilterSelection: function () {
      if (this.selectedCharacter) {
        const allRaces = [
          ...this.umamusumeRaceList_1,
          ...this.umamusumeRaceList_2,
          ...this.umamusumeRaceList_3,
        ];
        const raceById = new Map(allRaces.map((race) => [race.id, race]));
        this.extraRace = this.extraRace.filter((raceId) => {
          const race = raceById.get(raceId);
          if (!race) return false;
          return isRaceCompatibleWithCharacter(
            race,
            this.selectedCharacter,
            this.characterList,
            this.characterTrainingPeriods,
          );
        });
      }
      this.closeCharacterChangeModal();
    },
    toggleRace: function (raceId) {
      const index = this.extraRace.indexOf(raceId);
      if (index > -1) {
        this.extraRace.splice(index, 1);
      } else {
        this.extraRace.push(raceId);
      }
    },
    toggleSkill: function (skillName) {
      this.applySkillState(
        toggleSkillSelection(this.currentSkillState(), skillName),
      );
    },
    toggleBlacklistSkill: function (skillName) {
      this.applySkillState(
        toggleSkillBlacklist(this.currentSkillState(), skillName),
      );
    },
    switchAdvanceOption: function () {
      this.showAdvanceOption = !this.showAdvanceOption
    },
    openUraConfigModal: function () {
      this.showUraConfigModal = true;
    },
    closeUraConfigModal: function () {
      this.showUraConfigModal = false;
    },
    openAoharuConfigModal: function () {
      this.showAoharuConfigModal = true;
    },
    closeAoharuConfigModal: function () {
      this.showAoharuConfigModal = false;
    },
    handleUraConfigConfirm: function (data) {
      this.skillEventWeight = [...data.skillEventWeight];
      this.resetSkillEventWeightList = data.resetSkillEventWeightList;
      this.showUraConfigModal = false;
    },
    handleAoharuConfigConfirm: function (data) {
      this.preliminaryRoundSelections = [...data.preliminaryRoundSelections];
      this.aoharuTeamNameSelection = data.aoharuTeamNameSelection;
      this.showAoharuConfigModal = false;
    },
    getMantItemImg(id) {
      return new URL(`../assets/img/mant_items/${id}.png`, import.meta.url).href;
    },

    mantGetAllItemIds() {
      return this.mantItemIds;
    },
    mantGetDefaultTiers() {
      const t = {};
      this.mantGetAllItemIds().forEach(id => { t[id] = 2; });
      t['shuffle'] = 1;
      return t;
    },
    mantGetItemsInTier(tier) {
      return this.mantGetAllItemIds().filter(id => this.mantItemTiers[id] === tier);
    },
    mantDragStart(id, event) {
      this.mantDragItemId = id;
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', id);
    },
    mantDragEnd() {
      this.mantDragItemId = null;
      this.mantDragOverTier = null;
    },
    mantDropOnTier(tier, event) {
      const id = this.mantDragItemId || event.dataTransfer.getData('text/plain');
      if (id && this.mantItemTiers[id] !== undefined) {
        this.mantItemTiers[id] = tier;
      }
      this.mantDragItemId = null;
      this.mantDragOverTier = null;
    },
    mantMigrateLegacyTiers() {
      // Convert old tier -1 (blacklist) and 0 (unselected) to valid numbered tiers
      const ids = this.mantGetAllItemIds();
      let needsMigration = false;
      for (const id of ids) {
        if (this.mantItemTiers[id] !== undefined && this.mantItemTiers[id] < 1) {
          needsMigration = true;
          break;
        }
      }
      if (needsMigration) {
        if (this.mantTierCount < 2) this.mantTierCount = 2;
        for (const id of ids) {
          if (this.mantItemTiers[id] !== undefined && this.mantItemTiers[id] < 1) {
            this.mantItemTiers[id] = this.mantTierCount;
          }
        }
      }
      // Ensure all items have a valid tier
      for (const id of ids) {
        if (this.mantItemTiers[id] === undefined || this.mantItemTiers[id] < 1) {
          this.mantItemTiers[id] = this.mantTierCount;
        }
        if (this.mantItemTiers[id] > this.mantTierCount) {
          this.mantItemTiers[id] = this.mantTierCount;
        }
      }
    },
    mantAddTier() {
      this.mantTierCount++;
    },
    mantRemoveTier() {
      if (this.mantTierCount > 1) {
        // Move items from the removed tier to the new last tier
        const removedTier = this.mantTierCount;
        const newLast = this.mantTierCount - 1;
        this.mantGetAllItemIds().forEach(id => {
          if (this.mantItemTiers[id] === removedTier) {
            this.mantItemTiers[id] = newLast;
          }
        });
        this.mantTierCount--;
      }
    },
    cancelTask: function () {
      if (this.isSavingTask) return;
      $('#create-task-list-modal').modal('hide');
    },
    addRule() {
      this.raceTacticConditions.push({ op: '=', val: 1, val2: 24, tactic: 4 });
    },
    removeRule(idx) {
      if (idx >= 0 && idx < this.raceTacticConditions.length) {
        this.raceTacticConditions.splice(idx, 1);
      }
    },
    moveRuleUp(idx) {
      if (idx > 0) {
        const item = this.raceTacticConditions.splice(idx, 1)[0];
        this.raceTacticConditions.splice(idx - 1, 0, item);
      }
    },
    moveRuleDown(idx) {
      if (idx < this.raceTacticConditions.length - 1) {
        const item = this.raceTacticConditions.splice(idx, 1)[0];
        this.raceTacticConditions.splice(idx + 1, 0, item);
      }
    },
    addTask: function () {
      if (this.isSavingTask) {
        return;
      }
      if (this.isEditMode && !this.editingTaskId) {
        this.showToast("Unable to save: missing task id.");
        return;
      }
      const taskSkillPayload = buildTaskSkillPayloadFromVm(this);

      let payload: any = {
        app_name: "umamusume",
        task_execute_mode: this.selectedExecuteMode,
        task_type: this.selectedUmamusumeTaskType.id,
        task_desc: this.selectedUmamusumeTaskType.name,
        attachment_data: {
          "scenario": this.selectedScenario,
          "cure_asap_conditions": this.cureAsapConditions,
          "expect_attribute": [this.expectSpeedValue, this.expectStaminaValue, this.expectPowerValue, this.expectWillValue, this.expectIntelligenceValue],
          "follow_support_card_name": this.selectedSupportCard.name,
          "follow_support_card_level": this.supportCardLevel,
          "extra_race_list": this.extraRace,
          "learn_skill_list": taskSkillPayload.learn_skill_list,
          "learn_skill_blacklist": taskSkillPayload.learn_skill_blacklist,
          "tactic_list": [4, 4, 4], // Legacy dummy values
          "tactic_actions": this.raceTacticConditions,
          "clock_use_limit": this.clockUseLimit,
          "manual_purchase_at_end": this.manualPurchase,
          "skip_double_circle_unless_high_hint": this.skipDoubleCircleUnlessHighHint,
          "hint_boost_characters": [...this.hintBoostCharacters],
          "hint_boost_multiplier": this.hintBoostMultiplier,
          "friendship_score_groups": this.friendshipScoreGroups.map(g => ({ characters: [...g.characters], multiplier: g.multiplier })),
          "override_insufficient_fans_forced_races": this.overrideInsufficientFansForcedRaces,
          "learn_skill_threshold": this.learnSkillThreshold,
          "allow_recover_tp": this.recoverTP,
          "rest_threshold": this.restTreshold,  
          "compensate_failure": this.compensateFailure,
          "failure_rate_divisor": this.failureRateDivisor,
          "use_last_parents": this.useLastParents,
          "learn_skill_only_user_provided": this.learnSkillOnlyUserProvided,
          "extra_weight": [this.extraWeight1, this.extraWeight2, this.extraWeight3, this.extraWeightSummer],
          // Motivation thresholds for trip decisions
          "motivation_threshold_year1": this.motivationThresholdYear1,
          "motivation_threshold_year2": this.motivationThresholdYear2,
          "motivation_threshold_year3": this.motivationThresholdYear3,
          // 限时: 富士奇石的表演秀
          "fujikiseki_show_mode": this.fujikisekiShowMode,
          "fujikiseki_show_difficulty": this.fujikisekiShowDifficulty
        }
      }
      if (this.selectedExecuteMode === 2) {
        payload.cron_job_config = {
          cron: this.cron
        }
      }
      payload.attachment_data = payload.attachment_data || {};
      payload.attachment_data.event_choices = buildEventChoicesPayloadFromSelection(this.eventChoicesSelected);
      
      payload.attachment_data.event_weights = buildEventWeightsPayloadFromVm(this);
      Object.assign(payload.attachment_data, buildTaskScenarioConfigPayloadFromVm(this));
      Object.assign(payload.attachment_data, buildTaskPalConfigPayloadFromVm(this));
      Object.assign(payload.attachment_data, buildScoringPayloadFromVm(this));
      const requestPayload = this.isEditMode ? { ...payload, task_id: this.editingTaskId } : payload;
      const request = this.isEditMode
        ? this.axios.put("/task", requestPayload)
        : this.axios.post("/task", requestPayload);

      this.isSavingTask = true;
      request.then((res) => {
        this.showToast(this.taskSaveSuccessMessage((res && res.data) ? res.data : {}));
        $('#create-task-list-modal').modal('hide');
      }).catch(e => {
        this.showToast(this.extractApiError(e, this.isEditMode ? "Failed to update task" : "Failed to create task"));
        console.error(e)
      }).finally(() => {
        this.isSavingTask = false;
      })
    },
    applyPresetRace: function () {
      const scoringDefaults = createScoringDefaults();
      applyTaskFormStateFromSource(this, this.presetsUse, { defaultRaceTactics: [3, 3, 3] });
      applyPresetPalConfigSourceToVm(this, this.presetsUse);
      applyEventChoicesSourceToVm(this, this.presetsUse.event_overrides);

      applyScoringSourceToVm(this, this.presetsUse, scoringDefaults);

      const presetSkillState = parseSkillSelectionFromSource(this.presetsUse);
      applySkillSelectionStateToVm(this, presetSkillState);

      // Load event weights if present in preset
      if ('event_weights' in this.presetsUse && this.presetsUse.event_weights) {
        applyEventWeightsSourceToVm(this, this.presetsUse.event_weights);
      } else {
        // Reset to defaults if not in preset
        this.resetEventWeights();
      }

      applyScenarioConfigSourceToVm(this, this.presetsUse, {
        getDefaultMantItemTiers: () => this.mantGetDefaultTiers(),
        migrateMantTiers: () => this.mantMigrateLegacyTiers(),
      });

    },
    showModal: function () {
      $('#create-task-list-modal').modal('show');
    },
    hideModal: function () {
      $('#create-task-list-modal').modal('hide');
    },
    loadFromTask: function (task) {
      const scoringDefaults = createScoringDefaults();
      this.isEditMode = true;
      this.editingTaskId = task.task_id || null;
      this.editingTaskStatus = task.task_status;
      this.isSavingTask = false;
      this.activeSection = 'category-general';
      const data = task.attachment_data || task.detail || {};
      const modeMap = {
        TASK_EXECUTE_MODE_ONE_TIME: 1,
        TASK_EXECUTE_MODE_CRON_JOB: 2,
        TASK_EXECUTE_MODE_LOOP: 3,
        TASK_EXECUTE_MODE_TEAM_TRIALS: 4,
        TASK_EXECUTE_MODE_FULL_AUTO: 5
      };
      if (typeof task.task_execute_mode === 'string') {
        this.selectedExecuteMode = modeMap[task.task_execute_mode] || 3;
      } else {
        this.selectedExecuteMode = Number(task.task_execute_mode || 3);
      }
      applyTaskFormStateFromSource(this, data);
      applyTaskPalConfigSourceToVm(this, data);
      applyScoringSourceToVm(this, data, scoringDefaults);
      const taskSkillState = parseSkillSelectionFromSource(data);
      applySkillSelectionStateToVm(this, taskSkillState);
      applyEventWeightsSourceToVm(this, data.event_weights);
      applyEventChoicesSourceToVm(this, data.event_choices);
      applyScenarioConfigSourceToVm(this, data, {
        getDefaultMantItemTiers: () => this.mantGetDefaultTiers(),
        migrateMantTiers: () => this.mantMigrateLegacyTiers(),
      });
      this.$nextTick(() => {
        this.normalizeScoreArrays(3);
        const root = this.$refs.scrollPane;
        if (root) root.scrollTop = 0;
        if (this.onScrollSpy) this.onScrollSpy();
      });
    },
    getPresets: function () {
      return fetchCultivatePresets(this.axios).then((presets) => {
        this.cultivatePresets = presets;
        return presets;
      }).catch(() => {
        this.cultivatePresets = [];
        return [];
      });
    },
    addPresets: function (successMessage = 'Preset saved successfully') {
      if (this.isSavingPreset) return Promise.resolve();
      this.isSavingPreset = true;
      const savedName = (this.presetNameEdit || '').trim();
      const preset = buildPresetPayloadFromVm(this, savedName);
      return saveCultivatePreset(this.axios, preset).then(
        () => {
          return this.getPresets().then(() => {
            const saved = this.cultivatePresets.find(p => p.name === savedName)
            if (saved) {
              this.presetsUse = saved
            }
            this.showToast(successMessage);
          })
        }
      ).catch(e => {
        this.showToast(this.extractApiError(e, 'Failed to save preset'));
        throw e;
      }).finally(() => {
        this.isSavingPreset = false;
      })
    },
    togglePresetAction: function (which) {
      this.presetAction = this.presetAction === which ? null : which;
    },
    confirmAddPreset() {
      if (this.isSavingPreset) return;
      if (!this.presetNameEdit || this.presetNameEdit.trim() === "") return;
      if (this.presetNameEdit.trim() === 'Default') {
        window.alert('"Default" is reserved. Please choose another name.');
        return;
      }
      const exists = this.cultivatePresets.some(p => p.name === this.presetNameEdit);
      if (exists && !window.confirm(`Preset "${this.presetNameEdit}" exists. Overwrite?`)) {
        return;
      }
      this.addPresets('Preset saved successfully').then(() => {
        this.presetAction = null;
        this.presetNameEdit = "";
      }).catch(() => {});
    },
    confirmOverwritePreset() {
      if (this.isSavingPreset) return;
      if (!this.overwritePresetName) return;
      // For overwrite we simply save with the same name
      this.presetNameEdit = this.overwritePresetName;
      this.addPresets('Preset overwritten successfully').then(() => {
        this.presetAction = null;
      }).catch(() => {});
    },
    confirmDeletePreset() {
      if (this.isSavingPreset) return;
      if (!this.deletePresetName) return;
      if (!window.confirm(`Delete preset \"${this.deletePresetName}\"?`)) return;
      this.isSavingPreset = true;
      deleteCultivatePreset(this.axios, this.deletePresetName).then(() => {
        return this.getPresets();
      }).then(() => {
        this.presetAction = null;
        this.deletePresetName = "";
        this.showToast('Preset deleted successfully');
      }).catch(e => {
        this.showToast(this.extractApiError(e, 'Failed to delete preset'));
      }).finally(() => {
        this.isSavingPreset = false;
      });
    },
    exportPreset() {
      const preset = buildPresetPayloadFromVm(this, 'Shared Preset');
      const encoded = encodePreset(preset);
      if (encoded) {
        this.sharePresetText = encoded;
        const toastBody = document.querySelector('#liveToast .toast-body');
        if (toastBody) toastBody.textContent = 'Preset exported';
        this.successToast.toast('show');
      }
    },
    importPreset() {
      if (!this.sharePresetText) return;
      const preset = decodePreset(this.sharePresetText);
      if (!preset) return;
      this.presetsUse = preset;
      this.applyPresetRace();
      this.sharePresetText = '';
      const toastBody = document.querySelector('#liveToast .toast-body');
      if (toastBody) toastBody.textContent = 'Preset imported successfully';
      this.successToast.toast('show');
    },
    onExtraWeightInput(arr, idx) {
      // 限制输入范围 [-1, 1]
      if (arr[idx] > 1) arr[idx] = 1;
      if (arr[idx] < -1) arr[idx] = -1;
      // 检查是否全为-1，若是则重置最后一个输入为0并弹出警告
      if (arr.filter(v => v === -1).length === arr.length) {
        arr[idx] = 0;
        // 显示警告通知
        this.showWeightWarning();
      }
    },
    showWeightWarning() {
      let warnToast = document.getElementById('weightWarningToast');
      if (warnToast) {
        warnToast.classList.remove('hide');
        warnToast.classList.add('show');
        setTimeout(() => {
          warnToast.classList.remove('show');
          warnToast.classList.add('hide');
        }, 2000);
      }
    },
    openSupportCardSelectModal: function () {
      this.showSupportCardSelectModal = true;
    },
    closeSupportCardSelectModal: function () {
      this.showSupportCardSelectModal = false;
    },
    handleSupportCardConfirm(card) {
      this.selectedSupportCard = card;
      this.showSupportCardSelectModal = false;
    },
    renderSupportCardText(card) {
      if (!card) return '';
      let type = '';
      if (card.id >= 10000 && card.id < 20000) type = 'Speed';
      else if (card.id >= 20000 && card.id < 30000) type = 'Stamina';
      else if (card.id >= 30000 && card.id < 40000) type = 'Power';
      else if (card.id >= 40000 && card.id < 50000) type = 'Guts';
      else if (card.id >= 50000 && card.id < 60000) type = 'Wit';
      if (type) {
        return `【${card.name}】${type}·${card.desc}`;
      } else {
        return `【${card.name}】${card.desc}`;
      }
    },
    // New methods for dynamic priority system
    getActivePriorities: function () {
      return getSortedPriorities(this.activePriorities);
    },
    getSelectedSkillsForPriority: function (priority) {
      return getSkillsForPriority(this.selectedSkills, this.skillAssignments, priority);
    },
    addPriority: function () {
      this.applySkillState(addPriorityLevel(this.currentSkillState()));
    },
    removeLastPriority: function () {
      this.applySkillState(removeLastPriorityLevel(this.currentSkillState()));
    },
    clearSkillFilters() {
      this.skillFilter = {
        strategy: '',
        distance: '',
        tier: '',
        rarity: '',
        query: ''
      };
    },
    toggleSkillList() {
      this.showSkillList = !this.showSkillList;
    },
    scrollToSection(id) {
      const root = this.$refs.scrollPane;
      const el = root ? root.querySelector(`#${id}`) : document.getElementById(id);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        this.activeSection = id;
      }
    },
    initScrollSpy() {
      const root = this.$refs.scrollPane;
      if (!root) return;
      this.onScrollSpy = () => {
        const scrollTop = root.scrollTop;
        let current = this.sectionList[0]?.id;
        for (const section of this.sectionList) {
          const el = root.querySelector(`#${section.id}`);
          if (!el) continue;
          const top = el.offsetTop;
          if (top <= scrollTop + 100) {
            current = section.id;
          } else {
            break;
          }
        }
        this.activeSection = current;
      };
      root.addEventListener('scroll', this.onScrollSpy, { passive: true });
      window.addEventListener('resize', this.onScrollSpy, { passive: true });
      // run once
      this.onScrollSpy();
    },
    destroyScrollSpy() {
      const root = this.$refs.scrollPane;
      if (root && this.onScrollSpy) root.removeEventListener('scroll', this.onScrollSpy);
      if (this.onScrollSpy) window.removeEventListener('resize', this.onScrollSpy);
    }
  },
  unmounted() {
    this.destroyScrollSpy();
  }
}
</script>

<style scoped>
.btn {
  padding: 0.4rem 0.8rem !important;
  font-size: 1rem !important;
}

.red-button {
  background-color: red !important;
  padding: 0.4rem 0.8rem !important;
  font-size: 1rem !important;
  border-radius: 0.25rem;
}

/* 取消按钮样式 */
.cancel-btn {
  background-color: #dc3545 !important;
  /* Bootstrap的danger红色 */
  color: white !important;
  padding: 0.4rem 0.8rem !important;
  font-size: 1rem !important;
  border-radius: 0.25rem;
  margin-right: 10px;
  /* 与确认按钮间距 */
  border: none;
  cursor: pointer;
}

.cancel-btn:hover {
  background-color: #c82333 !important;
  /* 悬停时更深的红色 */
  color: white !important;
}

/* 确保modal body可以正确滚动 */
.modal-body {
  max-height: 80vh;
  overflow-y: auto;
}

.modal-body--split {
  display: grid;
  grid-template-columns: 260px 1fr;
  gap: 16px;
}

/* Enlarge modal size slightly */
#create-task-list-modal .modal-dialog {
  max-width: 1320px;
  width: 96vw;
}

@media (min-width: 1440px) {
  #create-task-list-modal .modal-dialog {
    max-width: 1380px;
  }
}

.side-nav {
  position: sticky;
  top: 16px;
  height: fit-content;
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 12px;
}

.side-nav-title {
  font-weight: 700;
  margin-bottom: 8px;
}

.side-nav-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.side-nav-list li a {
  display: block;
  padding: 8px 10px;
  color: #374151;
  border-radius: 8px;
  text-decoration: none;
}

.side-nav-list li a:hover {
  background: #f3f4f6;
}

.side-nav-list li a.active {
  background: #eef2ff;
  color: #4338ca;
  font-weight: 600;
}

.content-pane {
  min-width: 0;
}

/* 遮罩层样式 - 让TaskEditModal背景变暗并阻止交互 */
.modal-backdrop-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  z-index: 1055;
  /* 确保在TaskEditModal之上，但在AoharuConfigModal之下 */
  pointer-events: auto;
  /* 阻止与背景元素的交互 */
}

/* 只有青春杯配置弹窗时让TaskEditModal变暗 */
#create-task-list-modal.modal.show .modal-content {
  transition: opacity 0.3s ease;
}

#create-task-list-modal.modal.show .modal-content.dimmed {
  opacity: 0.6;
}

/* Smooth scroll behavior for in-pane anchors */
.content-pane {
  scroll-behavior: smooth;
}

.aoharu-btn-bg {
  background: linear-gradient(rgba(0, 0, 0, 0.3), rgba(0, 0, 0, 0.3)), url('../assets/img/scenario/aoharu_btn_bg.png') center center no-repeat;
  background-size: cover;
  background-position: center -50px;
  color: #ffffff !important;
  border: 2px solid rgba(255, 255, 255, 0.8);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.8);
  font-weight: 600;
  padding: 0.5rem 1rem !important;
  font-size: 1rem !important;
  border-radius: 0.25rem;
  width: 100%;
  min-height: 40px;
  display: inline-block;
  transition: all 0.3s ease;
}

.ura-btn-bg {
  background: linear-gradient(rgba(0, 0, 0, 0.3), rgba(0, 0, 0, 0.3)), url('../assets/img/scenario/ura_btn_bg.png') center center no-repeat;
  background-size: cover;
  background-position: center -100px;
  color: #ffffff !important;
  border: 2px solid rgba(255, 255, 255, 0.8);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.8);
  font-weight: 600;
  padding: 0.5rem 1rem !important;
  font-size: 1rem !important;
  border-radius: 0.25rem;
  width: 100%;
  min-height: 40px;
  display: inline-block;
  transition: all 0.3s ease;
}

/* Race Toggle Styles */
.race-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 12px;
  padding: 8px;
}

/* Category cards (section grouping) */
.category-card {
  background: transparent;
  border: 1px solid var(--accent);
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 20px;
  box-shadow: none;
}

.category-title {
  font-weight: 700;
  margin-bottom: 12px;
  font-size: 16px;
}

.race-toggle {
  background: #f8f9fa;
  border: 2px solid #e9ecef;
  border-radius: 8px;
  padding: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;
  overflow: hidden;
}

.race-toggle:hover {
  background: #e9ecef;
  border-color: #007bff;
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(0, 123, 255, 0.15);
}

.race-toggle.selected {
  background: #007bff;
  border-color: #0056b3;
  color: white;
  box-shadow: 0 2px 8px rgba(0, 123, 255, 0.3);
}

.race-toggle.selected:hover {
  background: #0056b3;
  border-color: #004085;
}

.race-content {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.race-name {
  font-weight: 600;
  font-size: 14px;
  line-height: 1.3;
  margin-bottom: 4px;
}

.race-badges {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-bottom: 4px;
}

.race-badges .badge {
  font-size: 10px;
  padding: 2px 6px;
  border-radius: 12px;
}

.race-details {
  font-size: 11px;
  opacity: 0.8;
  line-height: 1.2;
}

.race-toggle.selected .race-details {
  opacity: 0.9;
}

/* Skill Toggle Styles */
.skill-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 8px;
  padding: 8px;
}

.skill-toggle {
  background: #f8f9fa;
  border: 2px solid #e9ecef;
  border-radius: 6px;
  padding: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;
  overflow: hidden;
}

.skill-toggle:hover {
  background: #e9ecef;
  border-color: #007bff;
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(0, 123, 255, 0.15);
}

.skill-toggle.selected {
  background: #007bff;
  border-color: #0056b3;
  color: white;
  box-shadow: 0 2px 8px rgba(0, 123, 255, 0.3);
}

.skill-toggle.selected:hover {
  background: #0056b3;
  border-color: #004085;
}

.skill-toggle.blacklist-toggle {
  border-color: #dc3545;
}

.skill-toggle.blacklist-toggle:hover {
  border-color: #c82333;
  box-shadow: 0 2px 8px rgba(220, 53, 69, 0.15);
}

.skill-toggle.blacklist-toggle.selected {
  background: #dc3545;
  border-color: #c82333;
  box-shadow: 0 2px 8px rgba(220, 53, 69, 0.3);
}

.skill-toggle.blacklist-toggle.selected:hover {
  background: #c82333;
  border-color: #a71e2a;
}

.skill-content {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.skill-name {
  font-weight: 600;
  font-size: 12px;
  line-height: 1.2;
  margin-bottom: 2px;
}

.skill-priority {
  font-size: 10px;
  opacity: 0.8;
  line-height: 1.1;
}

.skill-type {
  font-size: 10px;
  opacity: 0.7;
  line-height: 1.1;
  font-style: italic;
}

.skill-description {
  font-size: 9px;
  opacity: 0.8;
  line-height: 1.2;
  margin-top: 4px;
  word-wrap: break-word;
}

.skill-cost {
  font-size: 9px;
  opacity: 0.9;
  line-height: 1.1;
  font-weight: 500;
}

.skill-type-group {
  margin-bottom: 16px;
}

.skill-type-header {
  font-size: 12px;
  font-weight: 600;
  color: #495057;
  margin-bottom: 8px;
  padding: 4px 8px;
  background: #e9ecef;
  border-radius: 4px;
  border-left: 3px solid #007bff;
}

.form-label {
  font-weight: 600;
  margin-bottom: 8px;
  color: #495057;
}

/* New styles for the redesigned skill learning interface */
.priority-section {
  margin-bottom: 16px;
}

.selected-skills-box,
.blacklist-box {
  border: 2px dashed #dee2e6;
  border-radius: 8px;
  padding: 16px;
  min-height: 80px;
  background: #f8f9fa;
  transition: all 0.2s ease;
}

.selected-skills-box:hover,
.blacklist-box:hover {
  border-color: #007bff;
  background: #f0f8ff;
}

.empty-state {
  color: #6c757d;
  font-style: italic;
  text-align: center;
  padding: 20px;
  font-size: 14px;
}

.selected-skills-list,
.blacklisted-skills-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.selected-skill-item,
.blacklisted-skill-item {
  background: #007bff;
  color: white;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
}

.blacklisted-skill-item {
  background: #dc3545;
}

.skill-list-container {
  border: 1px solid rgba(255,255,255,.12);
  border-radius: 12px;
  padding: 16px;
  background: transparent;
  max-height: 560px;
  overflow-y: auto;
}

.skill-type-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;
}

.skill-type-card {
  border: 1px solid rgba(255,255,255,.12);
  border-radius: 12px;
  background: transparent;
  overflow: hidden;
  box-shadow: none;
  transition: all 0.2s ease;
}

.skill-type-card:hover {
  border-color: rgba(255,255,255,.2);
  box-shadow: 0 2px 8px rgba(0,0,0,.2);
  transform: translateY(-1px);
}

.skill-type-header {
  background: transparent;
  color: var(--text);
  padding: 12px 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid rgba(255,255,255,.08);
}

.skill-type-title {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
}

.skill-count {
  font-size: 11px;
  opacity: 0.9;
  background: rgba(255, 255, 255, 0.08);
  padding: 2px 10px;
  border-radius: 12px;
  color: var(--muted);
  border: 1px solid rgba(255,255,255,.1);
}

.skill-type-content {
  padding: 12px;
  max-height: 360px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.skill-item {
  border: 1px solid rgba(255,255,255,.12);
  border-radius: 10px;
  padding: 10px;
  background: transparent;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 11px;
}

.skill-item:hover {
  border-color: var(--accent);
  box-shadow: 0 2px 6px color-mix(in srgb, var(--accent) 15%, transparent);
  transform: translateY(-1px);
}

.skill-item.selected {
  background: rgba(52,133,227,.08);
  border-color: #3485E3;
  color: var(--text);
  box-shadow: inset 0 0 0 2px rgba(52,133,227,.2);
}

.skill-item.blacklisted {
  background: rgba(255,77,109,.08);
  border-color: #ff4d6d;
  color: var(--text);
  box-shadow: inset 0 0 0 2px rgba(255,77,109,.15);
}

.skill-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
}

.skill-name {
  font-weight: 600;
  font-size: 12px;
  line-height: 1.2;
}

.skill-cost {
  font-size: 10px;
  opacity: 0.9;
  font-weight: 500;
  background: rgba(255, 255, 255, 0.06);
  padding: 2px 8px;
  border-radius: 8px;
  color: var(--muted);
  border: 1px solid rgba(255,255,255,.08);
}

.skill-details {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.skill-type {
  font-size: 10px;
  opacity: 0.8;
  line-height: 1.1;
  font-style: italic;
}

.skill-description {
  font-size: 9px;
  opacity: 0.8;
  line-height: 1.3;
  word-wrap: break-word;
}

.skill-item.selected .skill-type,
.skill-item.selected .skill-description {
  opacity: 0.9;
}

.skill-item.blacklisted .skill-type,
.skill-item.blacklisted .skill-description {
  opacity: 0.9;
}

/* Button group styling */
.btn-group {
  display: flex;
  gap: 8px;
}

.btn-group .btn {
  border-radius: 6px;
  font-size: 12px;
  padding: 6px 12px;
}

.btn-group .btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.skill-notes-alert {
  display: flex;
  align-items: center;
  font-size: 12px;
  color: var(--muted);
}

.skill-notes-alert i {
  margin-right: 5px;
}

.section-heading {
  display: flex;
  align-items: center;
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 10px;
}

.section-heading i {
  margin-right: 10px;
}

.filter-label {
  font-weight: 600;
  margin-bottom: 5px;
  color: var(--accent);
}

.skill-filter-section {
  margin-bottom: 20px;
  padding: 16px;
  background: transparent;
  border-radius: 10px;
  border: 1px solid rgba(255,255,255,.12);
}

/* Toggle row switch alignment */
.toggle-row .form-check.form-switch {
  display: flex;
  align-items: center;
  gap: 8px;
}

.toggle-row .form-check-input {
  width: 2.25rem;
  height: 1.125rem;
}

.toggle-row .form-check-label {
  margin-left: 4px;
}

/* Token toggles */
.token-toggle {
  display: inline-flex;
  background: transparent;
  border: 1px solid var(--accent);
  border-radius: 9999px;
  overflow: hidden;
}

.token-toggle .token {
  background: transparent;
  border: none;
  padding: 6px 14px;
  font-size: 12px;
  color: var(--accent);
  cursor: pointer;
}

.token-toggle .token.active {
  background: linear-gradient(135deg, var(--accent), var(--accent-2));
  color: #ffffff;
}

.token-toggle.disabled .token {
  opacity: 0.6;
  cursor: not-allowed;
}

.skill-notes-alert {
  display: flex;
  align-items: center;
  background: color-mix(in srgb, var(--accent) 8%, transparent);
  border: 1px solid color-mix(in srgb, var(--accent) 25%, transparent);
  border-left: 3px solid var(--accent);
  border-radius: 6px;
  padding: 8px 12px;
  font-size: 13px;
  color: var(--muted);
  font-weight: 500;
  box-shadow: none;
}

.skill-notes-alert i {
  margin-right: 8px;
  color: var(--accent);
}

.section-heading {
  display: flex;
  align-items: center;
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 12px;
  color: var(--text);
  padding: 8px 0;
  border-bottom: 2px solid rgba(255,255,255,.12);
}

.section-heading i {
  margin-right: 10px;
  color: var(--accent);
}

.filter-label {
  font-weight: 600;
  margin-bottom: 5px;
  color: var(--accent);
  font-size: 12px;
}

.skill-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-top: 6px;
}

.skill-tag {
  font-size: 8px;
  padding: 2px 6px;
  border-radius: 10px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.strategy-tag {
  background: color-mix(in srgb, var(--accent) 10%, transparent);
  color: var(--accent);
  border: 1px solid color-mix(in srgb, var(--accent) 25%, transparent);
}

.distance-tag {
  background: color-mix(in srgb, var(--accent-2) 10%, transparent);
  color: var(--accent-2);
  border: 1px solid color-mix(in srgb, var(--accent-2) 25%, transparent);
}

.tier-tag {
  background: rgba(255,255,255,.08);
  color: var(--muted);
  border: 1px solid rgba(255,255,255,.15);
}

.tier-tag[data-tier="SS"] {
  background: linear-gradient(135deg, #ff6b6b, #ee5a52);
  color: white;
  border: 1px solid #c44569;
}

.tier-tag[data-tier="S"] {
  background: linear-gradient(135deg, #ffa726, #ff9800);
  color: white;
  border: 1px solid #f57c00;
}

.tier-tag[data-tier="A"] {
  background: linear-gradient(135deg, #66bb6a, #4caf50);
  color: white;
  border: 1px solid #388e3c;
}

.tier-tag[data-tier="B"] {
  background: linear-gradient(135deg, #42a5f5, #2196f3);
  color: white;
  border: 1px solid #1976d2;
}

.tier-tag[data-tier="C"] {
  background: linear-gradient(135deg, #ab47bc, #9c27b0);
  color: white;
  border: 1px solid #7b1fa2;
}

.tier-tag[data-tier="D"] {
  background: linear-gradient(135deg, #78909c, #607d8b);
  color: white;
  border: 1px solid #455a64;
}

.rarity-tag {
  background: #e8f5e8;
  color: #388e3c;
  border: 1px solid #c8e6c9;
}

.skill-item.selected .skill-tag {
  background: rgba(255, 255, 255, 0.2);
  border-color: rgba(255, 255, 255, 0.3);
  color: white;
}

.skill-item.blacklisted .skill-tag {
  background: rgba(255, 255, 255, 0.2);
  border-color: rgba(255, 255, 255, 0.3);
  color: white;
}

.skill-list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: linear-gradient(135deg, #007bff, #0056b3);
  color: white;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 2px 4px rgba(0, 123, 255, 0.2);
  margin-bottom: 10px;
}

/* Header action buttons */
.header-actions button.btn.btn-sm.btn-outline-secondary {
  margin-right: 8px;
}

/* Reference palette tweaks */
.btn.auto-btn,
.btn.btn-primary {
  background-color: #1e40af !important;
  border-color: #1e40af !important;
}

.btn.btn-primary:hover,
.btn.auto-btn:hover {
  background-color: #1d4ed8 !important;
  border-color: #1d4ed8 !important;
}

.btn-outline-primary {
  color: #1e40af !important;
  border-color: #1e40af !important;
}

.btn-outline-primary:hover {
  background-color: #eef2ff !important;
}

.btn-outline-danger {
  color: #b91c1c !important;
  border-color: #b91c1c !important;
}

.btn-outline-danger:hover {
  background-color: #fee2e2 !important;
}

.btn-outline-success {
  color: #166534 !important;
  border-color: #166534 !important;
}

.btn-outline-success:hover {
  background-color: #dcfce7 !important;
}

.btn.btn-sm {
  padding: 6px 12px !important;
  font-size: 12px !important;
  border-radius: 8px !important;
}

.btn-group .btn {
  border-radius: 8px !important;
}

.dropdown-menu .dropdown-item {
  font-size: 13px;
}

.side-nav-list li a.active {
  background: #eef2ff;
  color: #1e40af;
}

/* Align inline buttons with inputs */
.input-group .btn.btn-sm {
  height: 32px;
  display: inline-flex;
  align-items: center;
}

.preset-actions .preset-save-group {
  display: inline-flex;
  align-items: stretch;
}

.skill-list-header:hover {
  background: linear-gradient(135deg, #0056b3, #004085);
  box-shadow: 0 4px 8px rgba(0, 123, 255, 0.3);
  transform: translateY(-1px);
}

.skill-list-title {
  font-weight: 600;
  font-size: 16px;
  display: flex;
  align-items: center;
}

.skill-list-title i {
  margin-right: 10px;
  font-size: 18px;
}

.skill-list-toggle {
  display: flex;
  align-items: center;
  background: rgba(255, 255, 255, 0.2);
  padding: 6px 12px;
  border-radius: 20px;
  font-weight: 500;
  font-size: 13px;
  transition: all 0.2s ease;
}

.skill-list-toggle:hover {
  background: rgba(255, 255, 255, 0.3);
}

.toggle-text {
  margin-right: 8px;
}

.skill-list-content {
  margin-top: 15px;
  animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.advanced-options-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: transparent;
  color: var(--text);
  border: 1px solid var(--accent);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: none;
  margin-bottom: 10px;
}

.advanced-options-header:hover {
  background: color-mix(in srgb, var(--accent) 8%, transparent);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--accent) 15%, transparent) inset;
  transform: translateY(-1px);
}

.advanced-options-title {
  font-weight: 600;
  font-size: 16px;
  display: flex;
  align-items: center;
}

.advanced-options-title i {
  margin-right: 10px;
  font-size: 18px;
}

.advanced-options-toggle {
  display: flex;
  align-items: center;
  background: rgba(255, 255, 255, 0.2);
  padding: 6px 12px;
  border-radius: 20px;
  font-weight: 500;
  font-size: 13px;
  transition: all 0.2s ease;
}

.advanced-options-toggle:hover {
  background: rgba(255, 255, 255, 0.3);
}

.advanced-options-content {
  margin-top: 15px;
  animation: fadeIn 0.3s ease;
}

.advanced-block {
  border: 1px solid color-mix(in srgb, var(--accent) 45%, transparent);
  border-radius: 10px;
  margin-bottom: 10px;
  background: color-mix(in srgb, var(--surface-2) 85%, transparent);
}

.advanced-block summary {
  cursor: pointer;
  list-style: none;
  font-weight: 600;
  padding: 10px 12px;
  color: var(--accent);
}

.advanced-block summary::-webkit-details-marker {
  display: none;
}

.advanced-block summary::after {
  content: '▾';
  float: right;
  transition: transform 0.2s ease;
}

.advanced-block[open] summary::after {
  transform: rotate(180deg);
}

.advanced-block-body {
  padding: 0 12px 12px 12px;
}

.decision-docs {
  display: grid;
  gap: 10px;
}

.decision-docs-lead {
  margin: 0;
  color: var(--text);
  font-weight: 500;
}

.decision-formula {
  margin: 0;
  border: 1px solid color-mix(in srgb, var(--accent) 30%, transparent);
  background: color-mix(in srgb, var(--surface-2) 90%, transparent);
  border-radius: 10px;
  padding: 10px 12px;
  color: var(--text);
  white-space: pre-wrap;
}

.decision-list {
  margin: 0;
  padding-left: 18px;
  display: grid;
  gap: 6px;
}

.decision-note {
  margin: 8px 0 0 0;
  color: var(--muted);
}

.race-options-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: transparent;
  color: var(--text);
  border: 1px solid var(--accent);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: none;
  margin-bottom: 12px;
}

.race-options-header:hover {
  background: color-mix(in srgb, var(--accent) 8%, transparent);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--accent) 15%, transparent) inset;
  transform: translateY(-1px);
}

.race-options-title {
  font-weight: 600;
  font-size: 16px;
  display: flex;
  align-items: center;
}

.race-options-title i {
  margin-right: 10px;
  font-size: 18px;
}

.race-options-toggle {
  display: flex;
  align-items: center;
  background: rgba(255, 255, 255, 0.2);
  padding: 6px 12px;
  border-radius: 20px;
  font-weight: 500;
  font-size: 13px;
  transition: all 0.2s ease;
}

.race-options-toggle:hover {
  background: rgba(255, 255, 255, 0.3);
}

.race-options-content {
  margin-top: 12px;
  animation: fadeIn 0.3s ease;
}

/* Race filter layout tidy */
.race-filters {
  display: grid;
  grid-template-columns: repeat(12, 1fr);
  gap: 12px;
}

.race-filters .filter {
  grid-column: span 4;
}

.race-filters .quick {
  grid-column: span 4;
}

.race-filters .distance {
  grid-column: span 4;
}

.preset-actions .dropdown-menu {
  display: block;
  position: absolute;
  transform: translateY(8px);
  min-width: 220px;
}

/* Custom Character Change Modal Styles */
.character-change-modal.show {
  z-index: 1050;
}

.character-change-modal .modal-dialog {
  max-width: 500px;
}

.character-change-modal .modal-footer .btn {
  min-width: 200px;
  margin: 5px;
  text-align: left;
  padding: 12px 16px;
}

.character-change-modal .modal-footer .btn small {
  font-size: 11px;
  opacity: 0.8;
  margin-top: 4px;
}

.character-change-modal .modal-footer .btn i {
  margin-right: 8px;
  width: 16px;
}

.character-change-modal .modal-body ul {
  margin-bottom: 0;
}

.character-change-modal .modal-body li {
  margin-bottom: 5px;
}

.Cure-asap {
  margin-top: 8px;
}

.Cure-asap label {
  font-weight: 600;
}

.Cure-asap textarea {
  min-height: 60px;
}
.race-toggle:hover{background:color-mix(in srgb, var(--accent) 8%, transparent)!important;border-color:var(--accent)!important;transform:translateY(-1px)}
.race-toggle.selected{background:transparent!important;border-color:var(--accent)!important}
.skill-toggle:hover{background:color-mix(in srgb, var(--accent) 8%, transparent)!important;border-color:var(--accent)!important;transform:translateY(-1px)}
.skill-toggle.selected{background:transparent!important;border-color:var(--accent)!important}
.skill-type-header,.section-heading,.skill-list-header,.hint-boost-header{background:transparent!important;color:var(--text)!important}
.blacklist-box:hover{border-color:var(--accent)!important;background:color-mix(in srgb, var(--accent) 8%, transparent)!important}
.blacklisted-skill-item{background:transparent!important;color:#ffb3c1!important}
.skill-list-container{border:1px solid rgba(255,255,255,.12)!important;border-radius:12px!important;padding:12px!important;background:transparent!important;max-height:500px}
.skill-type-card{border:1px solid rgba(255,255,255,.12)!important;border-radius:12px!important}
.skill-item{border:1px solid rgba(255,255,255,.12)!important;border-radius:10px!important;padding:10px!important;background:transparent!important;cursor:pointer}
.skill-item:hover{border-color:var(--accent)!important;box-shadow:0 2px 6px color-mix(in srgb, var(--accent) 15%, transparent)!important}
.skill-item.selected{background:rgba(52,133,227,.08)!important;border-color:#3485E3!important;box-shadow:0 0 0 2px rgba(52,133,227,.2) inset!important}
.skill-item.blacklisted{background:rgba(255,77,109,.08)!important;border-color:#ff4d6d!important}
.skill-item.selected .skill-tag,.skill-item.blacklisted .skill-tag{background:rgba(255,255,255,.2)!important}
.skill-filter-section{margin-bottom:20px;border-radius:10px!important;border:1px solid rgba(255,255,255,.12)!important;background:transparent!important;color:var(--text)!important}
.skill-filter-section ::placeholder{color:var(--muted-2)!important}
.filter-label{color:var(--accent)!important}
.token-toggle{background:transparent!important;border:1px solid var(--accent)!important}
.token-toggle .token{color:var(--accent)!important}
.token-toggle .token.active{background:var(--accent)!important;color:#fff!important}
#create-task-list-modal .modal-content.dimmed{opacity:.6;background:transparent!important;border:0!important}
.category-card{border:1px solid var(--accent)!important}
.race-options-header,.skill-list-header,.hint-boost-header,.section-heading,.skill-type-header{background:transparent!important;color:var(--text)!important;border-color:var(--accent)!important}
.selected-skills-box,.blacklist-box{background:var(--surface-2)!important;border:1px solid var(--accent)!important;color:var(--text)!important}
.skill-list-content,.skill-list-container,.skill-type-card,.skill-item{background:transparent!important;border:1px solid rgba(255,255,255,.12)!important}
.skill-item:hover{border-color:var(--accent)!important;box-shadow:0 2px 6px color-mix(in srgb, var(--accent) 15%, transparent)!important}
.skill-item.selected{background:rgba(52,133,227,.08)!important;border-color:#3485E3!important;box-shadow:inset 0 0 0 2px rgba(52,133,227,.2)!important;color:var(--text)!important}
.skill-item.blacklisted{background:rgba(255,77,109,.08)!important;border-color:#ff4d6d!important}
.blacklisted-skill-item{background:transparent!important;color:#ffb3c1!important}
.race-toggle:hover{background:color-mix(in srgb, var(--accent) 8%, transparent)!important;border-color:var(--accent)!important}
.race-toggle.selected{background:transparent!important;border:2px solid var(--accent)!important;box-shadow:0 0 0 2px color-mix(in srgb, var(--accent) 35%, transparent) inset,0 0 14px color-mix(in srgb, var(--accent) 35%, transparent)!important}
.btn-outline-primary.dropdown-toggle,.show>.btn-outline-primary.dropdown-toggle{border-color:var(--accent)!important;color:var(--accent)!important;background:transparent!important}

.event-weights-section {
  background: var(--surface-2);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.event-weights-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 2px solid var(--accent);
}

.event-weights-title {
  font-size: 18px;
  font-weight: 600;
  color: var(--text);
  display: flex;
  align-items: center;
  gap: 10px;
}

.event-weights-title i {
  color: var(--accent);
  font-size: 20px;
}

.reset-weights-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  border-color: var(--accent) !important;
  color: var(--accent) !important;
  transition: all 0.2s ease;
}

.reset-weights-btn:hover {
  background: var(--accent) !important;
  color: white !important;
  transform: translateY(-1px);
  box-shadow: 0 2px 6px color-mix(in srgb, var(--accent) 30%, transparent);
}

.event-weights-description {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 20px;
}

.description-text {
  font-size: 14px;
  color: var(--text);
  margin-bottom: 12px;
  line-height: 1.6;
}

.calculation-formula {
  background: rgba(52, 133, 227, 0.1);
  border-left: 3px solid #3485E3;
  padding: 10px 12px;
  margin-bottom: 12px;
  border-radius: 4px;
  font-size: 13px;
  color: var(--text);
}

.calculation-formula code {
  background: rgba(0, 0, 0, 0.2);
  padding: 2px 6px;
  border-radius: 3px;
  font-family: 'Courier New', monospace;
  font-size: 12px;
  color: #7dd3fc;
}

.special-cases {
  font-size: 13px;
  color: var(--text);
}

.special-cases strong {
  color: var(--accent);
}

.special-cases ul {
  margin-top: 8px;
  margin-bottom: 0;
  padding-left: 20px;
}

.special-cases li {
  margin-bottom: 8px;
  line-height: 1.6;
}

.special-cases li strong {
  color: #7dd3fc;
  font-weight: 600;
}

.event-weights-table {
  font-size: 13px;
  margin-bottom: 0;
  background: transparent;
}

.event-weights-table thead {
  background: rgba(255, 255, 255, 0.05);
}

.event-weights-table th {
  font-weight: 600;
  color: var(--text);
  border-color: rgba(255, 255, 255, 0.12) !important;
  padding: 10px;
}

.event-weights-table td {
  border-color: rgba(255, 255, 255, 0.12) !important;
  padding: 8px;
  color: var(--text);
}

.event-weights-table td strong {
  color: var(--accent);
}

.event-weights-table input.form-control {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.12);
  color: var(--text);
  transition: all 0.2s ease;
}

.event-weights-table input.form-control:focus {
  background: rgba(255, 255, 255, 0.08);
  border-color: var(--accent);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--accent) 20%, transparent);
  color: var(--text);
}

.hint-boost-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border: 1px solid var(--accent);
  border-radius: 8px;
  background: transparent;
  cursor: pointer;
  color: var(--text);
  box-shadow: none;
  margin-bottom: 10px;
  transition: all 0.2s ease;
}

.hint-boost-header:hover {
  background: rgba(255,45,163,.08);
  border-color: var(--accent);
  box-shadow: 0 0 0 2px rgba(255,45,163,.15) inset;
}
.hint-boost-title {
  color: var(--accent);
  font-weight: 700;
}
.hint-boost-toggle {
  display: flex;
  align-items: center;
  gap: 8px;
  background: rgba(255, 255, 255, 0.2);
  padding: 6px 12px;
  border-radius: 20px;
  font-weight: 500;
  font-size: 13px;
  transition: all 0.2s ease;
}
.hint-boost-toggle:hover {
  background: rgba(255, 255, 255, 0.3);
}
.hint-boost-toggle .toggle-text {
  color: var(--muted);
}

.hint-boost-badge {
  font-size: 0.8em;
  padding: 4px 12px;
  border-radius: 9999px;
  border: 1px solid var(--accent);
  color: var(--accent);
  font-weight: 600;
  background: rgba(255,45,163,.06);
}
.hint-boost-content {
  padding: 16px 0 0 0;
}
.hint-slider-group {
  display: flex;
  align-items: center;
  gap: 10px;
}
.hint-slider {
  flex: 1;
  -webkit-appearance: none;
  appearance: none;
  height: 6px;
  border-radius: 3px;
  background: rgba(255,255,255,.12);
  outline: none;
}
.hint-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--accent), var(--accent-2));
  cursor: pointer;
  box-shadow: 0 0 8px rgba(255,45,163,.5);
}
.hint-slider::-moz-range-thumb {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--accent), var(--accent-2));
  cursor: pointer;
  border: none;
  box-shadow: 0 0 8px rgba(255,45,163,.5);
}
.hint-boost-selected {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.hint-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border-radius: 9999px;
  border: 1px solid var(--accent);
  color: #fff;
  font-size: 12px;
  cursor: pointer;
  transition: all .2s;
  background: rgba(255,45,163,.08);
}
.hint-chip:hover {
  background: rgba(255,45,163,.15);
  transform: scale(1.05);
}
.hint-chip-icon {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  object-fit: cover;
}
.hint-chip-remove {
  font-size: 10px;
  opacity: .7;
}
.hint-char-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(155px, 1fr));
  gap: 8px;
  max-height: 300px;
  overflow-y: auto;
  padding: 6px;
  border: 1px solid rgba(255,255,255,.08);
  border-radius: 10px;
}
.hint-char-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 10px;
  border-radius: 8px;
  border: 1px solid rgba(255,255,255,.12);
  cursor: pointer;
  transition: all .2s;
  font-size: 12px;
  color: #fff;
  background: transparent;
}
.hint-char-item:hover {
  border-color: var(--accent);
  background: rgba(255,45,163,.06);
}
.hint-char-item.selected {
  border-color: var(--accent);
  background: rgba(255,45,163,.12);
  box-shadow: 0 0 0 1px rgba(255,45,163,.3) inset;
}
.hint-char-icon {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  object-fit: cover;
  flex-shrink: 0;
}
.hint-char-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.mant-controls {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.mant-tierlist {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.mant-tier-row {
  display: flex;
  align-items: stretch;
  min-height: 62px;
  border: 1px solid rgba(255,255,255,.08);
  border-radius: 8px;
  overflow: hidden;
}
.mant-tier-label {
  width: 90px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: .4px;
  padding: 4px;
}
.mant-tier-label--prio {
  background: rgba(59,130,246,.15);
  color: #60a5fa;
  border-right: 2px solid rgba(59,130,246,.3);
}

.mant-tier-items {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  padding: 4px 8px;
  flex: 1;
  align-items: center;
  align-content: flex-start;
}
.mant-tier-empty {
  font-size: 11px;
  color: rgba(255,255,255,.2);
  font-style: italic;
}
.mant-item-cell {
  position: relative;
  width: 48px;
  height: 48px;
  border-radius: 6px;
  border: 2px solid rgba(255,255,255,.12);
  cursor: grab;
  overflow: hidden;
  transition: all .15s ease;
}
.mant-item-cell:hover {
  transform: scale(1.08);
  border-color: var(--accent);
}
.mant-item-cell:active {
  cursor: grabbing;
}
.mant-tier-row.mant-tier-dragover {
  background: rgba(59,130,246,.12);
  border-color: #3b82f6;
}
.mant-item-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.mant-thresholds {
  border-top: 1px solid rgba(255,255,255,.08);
  padding-top: 12px;
}
.mant-threshold-group {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 8px;
}
.mant-threshold-row {
  display: flex;
  align-items: center;
  gap: 10px;
}
.mant-threshold-img {
  width: 36px;
  height: 36px;
  border-radius: 6px;
  border: 1px solid rgba(255,255,255,.12);
  object-fit: cover;
  flex-shrink: 0;
}
.mant-threshold-controls {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.mant-threshold-label {
  font-size: 11px;
  font-weight: 600;
  color: var(--muted);
  text-transform: uppercase;
  letter-spacing: .3px;
}
.mant-threshold-slider-row {
  display: flex;
  align-items: center;
  gap: 10px;
}
.mant-threshold-val {
  min-width: 40px;
  text-align: center;
  font-size: 13px;
  font-weight: 700;
  color: var(--accent);
}
.mant-threshold-img-grid {
  width: 36px;
  height: 36px;
  display: grid;
  grid-template-columns: 1fr 1fr;
  grid-template-rows: 1fr 1fr;
  gap: 1px;
  border-radius: 6px;
  border: 1px solid rgba(255,255,255,.12);
  overflow: hidden;
  flex-shrink: 0;
}
.mant-threshold-img-grid img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

</style>
