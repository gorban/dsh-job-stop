window.__ModuleLoader__.load({
	id: "@gorban/dsh-job-stop",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		let react = require("react");
		let _deepseek_ai_dsh_client_ui_primitives = require("@deepseek-ai/dsh-client-ui-primitives");
		let react_jsx_runtime = require("react/jsx-runtime");
		//#region src/protocol.ts
		/**
		* The one wire contract shared by this plugin's host and browser halves.
		*
		* It deliberately imports nothing: the browser half inlines this module into
		* the client bundle, so it must stay free of host-only packages.
		* @module @gorban/dsh-job-stop/protocol
		*/
		/** The exact authenticated route the browser half posts to. */
		const JOB_STOP_PATH = "/api/dsh-job-stop/kill";
		//#endregion
		//#region \0dsh-css:module:src/client/JobStopAction.module.css.mjs
		const css = ".YRrbmW_root{position:relative}.YRrbmW_trigger{min-height:28px;color:var(--dsw-alias-label-tertiary);cursor:pointer;background:0 0;border:0;border-radius:6px;align-items:center;gap:3px;padding:3px 2px;font-size:12px;line-height:18px;display:inline-flex}.YRrbmW_trigger:hover,.YRrbmW_trigger:focus-visible{color:var(--dsw-alias-label-secondary)}.YRrbmW_trigger svg{transition:transform .12s}.YRrbmW_triggerOpen{transform:rotate(180deg)}.YRrbmW_triggerDot{flex:none}.YRrbmW_count{margin:0 5px}.YRrbmW_menu{z-index:100;box-sizing:border-box;background:var(--dsw-specific-menu);--dsh-scrollbar-thumb:var(--dsw-alias-scrollbar-bg-l2);--dsh-scrollbar-thumb-hover:var(--dsw-alias-scrollbar-hover-l2);--dsw-elevation-stroke-color:var(--dsw-alias-border-l1);width:336px;max-width:min(400px,100vw - 32px);max-height:min(420px,100vh - 140px);box-shadow:var(--dsw-elevation-prominent);border:0;border-radius:20px;flex-direction:column;gap:1px;margin:0;padding:4px;list-style:none;display:flex;position:absolute;top:calc(100% + 5px);left:0;overflow:auto}.YRrbmW_row{box-sizing:border-box;width:100%;min-height:32px;color:var(--dsw-alias-label-primary);border-radius:8px;align-items:center;gap:8px;padding:6px 8px;font-size:13px;line-height:18px;display:flex}.YRrbmW_rowSettled{color:var(--dsw-alias-label-tertiary)}.YRrbmW_dotSlot{flex:none;justify-content:center;align-items:center;width:16px;height:16px;display:inline-flex;position:relative}.YRrbmW_rowDot{flex:none;transition:opacity .12s}.YRrbmW_stopButton{color:var(--dsw-alias-state-error-primary);cursor:pointer;opacity:0;pointer-events:none;background:0 0;border:0;border-radius:4px;justify-content:center;align-items:center;padding:0;transition:opacity .12s;display:inline-flex;position:absolute;inset:0}.YRrbmW_row:hover .YRrbmW_stopButton,.YRrbmW_stopButton:focus-visible{opacity:1;pointer-events:auto}.YRrbmW_row:hover .YRrbmW_rowDot{opacity:0}.YRrbmW_stopButton:focus-visible{outline:2px solid var(--dsw-alias-state-error-primary);outline-offset:1px}.YRrbmW_kind{background:var(--dsw-alias-fill-l2);color:var(--dsw-alias-label-secondary);border-radius:5px;flex:none;padding:0 6px;font-size:11px;line-height:18px}.YRrbmW_label{min-width:0;font-family:var(--dsw-font-mono);white-space:nowrap;text-overflow:ellipsis;flex:1;overflow:hidden}.YRrbmW_status,.YRrbmW_duration{color:var(--dsw-alias-label-tertiary);flex:none;font-size:11px;line-height:18px}.YRrbmW_status{white-space:nowrap;text-overflow:ellipsis;max-width:40%;overflow:hidden}.YRrbmW_duration{font-variant-numeric:tabular-nums}.YRrbmW_confirmAction:not(:disabled){color:var(--dsw-alias-state-error-primary)}.YRrbmW_lead{color:var(--dsw-alias-label-secondary);margin:0 0 12px;font-size:13px;line-height:20px}.YRrbmW_details{grid-template-columns:auto minmax(0,1fr);gap:6px 12px;margin:0;display:grid}.YRrbmW_term{color:var(--dsw-alias-label-tertiary);font-size:12px;line-height:18px}.YRrbmW_value,.YRrbmW_mono,.YRrbmW_command{color:var(--dsw-alias-label-primary);margin:0;font-size:12px;line-height:18px}.YRrbmW_mono,.YRrbmW_command{font-family:var(--dsw-font-mono)}.YRrbmW_command{white-space:pre-wrap;overflow-wrap:anywhere;max-height:180px;overflow:auto}.YRrbmW_error{color:var(--dsw-alias-state-error-primary);margin-top:12px;font-size:12px;line-height:18px}@media (prefers-reduced-motion:reduce){.YRrbmW_rowDot,.YRrbmW_stopButton,.YRrbmW_trigger svg{transition:none}}";
		const tagId = "@gorban/dsh-job-stop/src/client/JobStopAction.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "@gorban/dsh-job-stop";
			tag.dataset.pluginCss = tagId;
			tag.textContent = css;
			document.head.appendChild(tag);
		}
		var JobStopAction_module_css_default = {
			"command": "YRrbmW_command",
			"confirmAction": "YRrbmW_confirmAction",
			"count": "YRrbmW_count",
			"details": "YRrbmW_details",
			"dotSlot": "YRrbmW_dotSlot",
			"duration": "YRrbmW_duration",
			"error": "YRrbmW_error",
			"kind": "YRrbmW_kind",
			"label": "YRrbmW_label",
			"lead": "YRrbmW_lead",
			"menu": "YRrbmW_menu",
			"mono": "YRrbmW_mono",
			"root": "YRrbmW_root",
			"row": "YRrbmW_row",
			"rowDot": "YRrbmW_rowDot",
			"rowSettled": "YRrbmW_rowSettled",
			"status": "YRrbmW_status",
			"stopButton": "YRrbmW_stopButton",
			"term": "YRrbmW_term",
			"trigger": "YRrbmW_trigger",
			"triggerDot": "YRrbmW_triggerDot",
			"triggerOpen": "YRrbmW_triggerOpen",
			"value": "YRrbmW_value"
		};
		//#endregion
		//#region src/client/JobStopAction.tsx
		/**
		* The session-header background-job list, with a human stop affordance.
		*
		* This component shadows the built-in `job-list` entry (same cell id, lower
		* priority) rather than adding a second header control: the list is the only
		* place a job's command is legible, so it is where a stop belongs.
		*
		* Hovering a *running* row covers its animated state dot with a stop button
		* (tooltip, accessible name, localized); activating it opens the house
		* confirmation dialog — the same `Modal` + `Button` composition the session
		* rename and workspace delete dialogs use — restating the full command, kind,
		* status, elapsed time, and job id before anything is cancelled.
		* @module @gorban/dsh-job-stop/client/JobStopAction
		*/
		/** Stable empty list so a session with no jobs keeps one array identity. */
		const NO_JOBS = [];
		/** A job the registry still holds open, and whose duration therefore ticks. */
		function isLive(job) {
			return job.status === "running" || job.status === "stopping";
		}
		/** Closed-union exhaustiveness fence for the wire status set. */
		/* v8 ignore next 3 -- closed-union backstop; only reached if a status is forged */
		function assertNever(value) {
			throw new Error(`unhandled job status: ${JSON.stringify(value)}`);
		}
		/**
		* Status marker semantics. `stopping` and `killed` share the attention color:
		* both mean the work ended (or is ending) on request rather than on its own.
		*/
		function dotState(status) {
			switch (status) {
				case "running": return "ongoing";
				case "stopping": return "warning";
				case "completed": return "done";
				case "killed": return "warning";
				case "failed": return "error";
				/* v8 ignore next -- closed wire status union */
				default: return assertNever(status);
			}
		}
		/** Human status word for the row, the dialog, and their accessible names. */
		function statusLabel(status, t) {
			switch (status) {
				case "running": return t("status.running");
				case "stopping": return t("status.stopping");
				case "completed": return t("status.completed");
				case "killed": return t("status.killed");
				case "failed": return t("status.failed");
				/* v8 ignore next -- closed wire status union */
				default: return assertNever(status);
			}
		}
		/**
		* Elapsed time in at most two adjacent units. A background job that outlives
		* an hour is already exceptional, so hours is the widest unit.
		*/
		function formatDuration(elapsedMs, t) {
			const total = Math.max(0, Math.floor(elapsedMs / 1e3));
			const seconds = total % 60;
			const minutes = Math.floor(total / 60) % 60;
			const hours = Math.floor(total / 3600);
			if (hours > 0) return t("duration.hours", {
				hours,
				minutes
			});
			if (minutes > 0) return t("duration.minutes", {
				minutes,
				seconds
			});
			return t("duration.seconds", { seconds });
		}
		/**
		* Live rows first in start order, then settled rows newest-first, with a
		* same-millisecond tie broken on start order so the sort never depends on the
		* host's map iteration.
		*/
		function ordered(jobs) {
			return [...jobs].sort((left, right) => {
				const liveLeft = isLive(left);
				if (liveLeft !== isLive(right)) return liveLeft ? -1 : 1;
				if (liveLeft) return left.startedAt - right.startedAt;
				const finished = (right.finishedAt ?? right.startedAt) - (left.finishedAt ?? left.startedAt);
				return finished !== 0 ? finished : left.startedAt - right.startedAt;
			});
		}
		/** Map a host refusal onto the copy that explains it. */
		function errorKey(code) {
			switch (code) {
				case "invalid-request": return "error.invalid-request";
				case "no-live-session": return "error.no-live-session";
				case "job-not-found": return "error.job-not-found";
				case "kill-failed": return "error.kill-failed";
				case "unreachable": return "error.unreachable";
				default: return "error.unknown";
			}
		}
		/** Explain a caught value without assuming it is an `Error`. */
		function messageOf(error) {
			return error instanceof Error ? error.message : String(error);
		}
		/** Accept only the plugin's own envelope, so a proxy error page is a failure. */
		function isJobStopResponse(value) {
			if (typeof value !== "object" || value === null) return false;
			const candidate = value;
			if (candidate.ok === true) return candidate.result === "requested" || candidate.result === "already-finished";
			if (candidate.ok !== false) return false;
			const error = candidate.error;
			if (typeof error !== "object" || error === null) return false;
			return typeof error.code === "string";
		}
		/**
		* Ask the host to stop one job. The carrier is the authenticated Connection
		* fetch route, so the trust fence has already run by the time the host sees it.
		* @param sessionId - the owning session, as the header slot received it.
		* @param jobId - the registry id published in the list.
		* @returns the host envelope, or an `unreachable` refusal.
		*/
		async function stopJob(sessionId, jobId) {
			let response;
			try {
				response = await fetch(JOB_STOP_PATH, {
					method: "POST",
					credentials: "include",
					headers: { "content-type": "application/json" },
					body: JSON.stringify({
						sessionId,
						jobId
					})
				});
			} catch (error) {
				return {
					ok: false,
					error: {
						code: "unreachable",
						message: messageOf(error)
					}
				};
			}
			let body;
			try {
				body = await response.json();
			} catch {
				body = void 0;
			}
			if (isJobStopResponse(body)) return body;
			return {
				ok: false,
				error: {
					code: "unreachable",
					message: `HTTP ${response.status}`
				}
			};
		}
		/**
		* Session-header entry point for this session's background jobs.
		* @param props - runtime slot currency plus the namespace translator.
		* @returns the trigger, its popover list, and the stop confirmation, or null
		*   when the session has no jobs at all.
		*/
		function JobStopAction({ sessionId, useSessions, t }) {
			const jobs = useSessions((state) => state.jobsBySession[sessionId]) ?? NO_JOBS;
			const [open, setOpen] = (0, react.useState)(false);
			const [now, setNow] = (0, react.useState)(() => Date.now());
			const [target, setTarget] = (0, react.useState)(null);
			const [stopping, setStopping] = (0, react.useState)(false);
			const [error, setError] = (0, react.useState)(null);
			const rootRef = (0, react.useRef)(null);
			const triggerRef = (0, react.useRef)(null);
			const rows = (0, react.useMemo)(() => ordered(jobs), [jobs]);
			const liveCount = (0, react.useMemo)(() => jobs.filter(isLive).length, [jobs]);
			(0, _deepseek_ai_dsh_client_ui_primitives.useDismissOnOutsidePointer)(rootRef, open, setOpen);
			(0, react.useEffect)(() => {
				if (!open || liveCount === 0) return;
				setNow(Date.now());
				const timer = setInterval(() => {
					setNow(Date.now());
				}, 1e3);
				return () => {
					clearInterval(timer);
				};
			}, [open, liveCount]);
			(0, react.useEffect)(() => {
				if (jobs.length === 0 && open) setOpen(false);
			}, [jobs.length, open]);
			if (jobs.length === 0) return null;
			const countLabel = t(liveCount > 0 ? liveCount === 1 ? "count.live.one" : "count.live.other" : jobs.length === 1 ? "count.idle.one" : "count.idle.other", { count: liveCount > 0 ? liveCount : jobs.length });
			const onKeyDown = (event) => {
				if (event.key !== "Escape" || !open) return;
				event.preventDefault();
				setOpen(false);
				triggerRef.current?.focus();
			};
			const openConfirm = (job) => {
				setOpen(false);
				setError(null);
				setTarget({
					job,
					at: Date.now()
				});
			};
			const closeConfirm = () => {
				if (stopping) return;
				setTarget(null);
				setError(null);
			};
			const confirmStop = () => {
				if (target === null || stopping) return;
				setStopping(true);
				setError(null);
				stopJob(sessionId, target.job.id).then((result) => {
					setStopping(false);
					if (result.ok) {
						setTarget(null);
						return;
					}
					setError(t(errorKey(result.error.code), { message: result.error.message }));
				});
			};
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				ref: rootRef,
				className: JobStopAction_module_css_default.root,
				onKeyDown,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
						ref: triggerRef,
						type: "button",
						className: JobStopAction_module_css_default.trigger,
						"aria-expanded": open,
						"aria-label": countLabel,
						onClick: () => {
							setNow(Date.now());
							setOpen((current) => !current);
						},
						children: [
							liveCount > 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.StateDot, {
								state: "ongoing",
								className: JobStopAction_module_css_default.triggerDot
							}) : null,
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: JobStopAction_module_css_default.count,
								children: countLabel
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconChevronDownOutline14, { className: open ? JobStopAction_module_css_default.triggerOpen : void 0 })
						]
					}),
					open ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("ul", {
						className: JobStopAction_module_css_default.menu,
						"aria-label": t("list.aria"),
						children: rows.map((job) => {
							const live = isLive(job);
							const duration = formatDuration(live ? now - job.startedAt : (job.finishedAt ?? job.startedAt) - job.startedAt, t);
							const status = statusLabel(job.status, t);
							return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("li", {
								className: live ? JobStopAction_module_css_default.row : `${JobStopAction_module_css_default.row} ${JobStopAction_module_css_default.rowSettled}`,
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
										className: JobStopAction_module_css_default.dotSlot,
										children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.StateDot, {
											state: dotState(job.status),
											className: JobStopAction_module_css_default.rowDot
										}), job.status === "running" ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Tooltip, {
											label: t("stop.tooltip"),
											side: "top",
											children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
												type: "button",
												className: JobStopAction_module_css_default.stopButton,
												"aria-label": t("stop.aria", { label: job.label }),
												onClick: () => {
													openConfirm(job);
												},
												children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconStopFill16, { size: 12 })
											})
										}) : null]
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: JobStopAction_module_css_default.kind,
										children: job.kind
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: JobStopAction_module_css_default.label,
										title: job.label,
										children: job.label
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: JobStopAction_module_css_default.status,
										title: job.detail ?? status,
										children: job.detail ?? status
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: JobStopAction_module_css_default.duration,
										title: t(live ? "duration.title.live" : "duration.title.done", { duration }),
										children: duration
									})
								]
							}, job.id);
						})
					}) : null,
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Modal, {
						open: target !== null,
						onClose: closeConfirm,
						closeLabel: t("close"),
						title: t("confirm.title"),
						footer: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
							variant: "outline",
							disabled: stopping,
							onClick: closeConfirm,
							children: t("cancel")
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
							variant: "outline",
							className: JobStopAction_module_css_default.confirmAction,
							disabled: stopping,
							onClick: confirmStop,
							children: t("confirm.action")
						})] }),
						children: target === null ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
								className: JobStopAction_module_css_default.lead,
								children: t("confirm.lead")
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("dl", {
								className: JobStopAction_module_css_default.details,
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("dt", {
										className: JobStopAction_module_css_default.term,
										children: t("field.command")
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("dd", {
										className: JobStopAction_module_css_default.command,
										children: target.job.label
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("dt", {
										className: JobStopAction_module_css_default.term,
										children: t("field.kind")
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("dd", {
										className: JobStopAction_module_css_default.value,
										children: target.job.kind
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("dt", {
										className: JobStopAction_module_css_default.term,
										children: t("field.status")
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("dd", {
										className: JobStopAction_module_css_default.value,
										children: statusLabel(target.job.status, t)
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("dt", {
										className: JobStopAction_module_css_default.term,
										children: t("field.elapsed")
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("dd", {
										className: JobStopAction_module_css_default.value,
										children: formatDuration(target.at - target.job.startedAt, t)
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("dt", {
										className: JobStopAction_module_css_default.term,
										children: t("field.id")
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("dd", {
										className: JobStopAction_module_css_default.mono,
										children: target.job.id
									})
								]
							}),
							error !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								className: JobStopAction_module_css_default.error,
								role: "alert",
								children: error
							})
						] })
					})
				]
			});
		}
		//#endregion
		//#region src/client/locales.ts
		/**
		* `jobStop` namespace dictionaries.
		*
		* The count/status/duration keys deliberately repeat the built-in `job`
		* namespace's copy instead of borrowing it: this plugin shadows that plugin's
		* list entry, and reading another package's private dictionary keys would make
		* an upstream copy change break this control silently. One small duplication
		* buys an independent release cycle.
		* @module @gorban/dsh-job-stop/client/locales
		*/
		/** Dictionary namespace owned by this plugin. */
		const NS = "jobStop";
		/** Simplified Chinese dictionary (the key-set source of truth). */
		const zh = {
			"count.live.one": "{count} 个后台任务运行中",
			"count.live.other": "{count} 个后台任务运行中",
			"count.idle.one": "{count} 个后台任务",
			"count.idle.other": "{count} 个后台任务",
			"list.aria": "后台任务",
			"status.running": "运行中",
			"status.stopping": "正在停止",
			"status.completed": "已完成",
			"status.killed": "已取消",
			"status.failed": "已失败",
			"duration.seconds": "{seconds}秒",
			"duration.minutes": "{minutes}分{seconds}秒",
			"duration.hours": "{hours}小时{minutes}分",
			"duration.title.live": "已运行 {duration}",
			"duration.title.done": "耗时 {duration}",
			"stop.tooltip": "停止这个后台任务",
			"stop.aria": "停止后台任务：{label}",
			"confirm.title": "停止这个后台任务？",
			"confirm.lead": "将立即终止该任务，尚未完成的工作会丢失。",
			"confirm.action": "停止任务",
			"field.command": "命令",
			"field.kind": "类型",
			"field.status": "状态",
			"field.elapsed": "已运行",
			"field.id": "任务 ID",
			"cancel": "取消",
			"close": "关闭",
			"error.invalid-request": "停止请求无效，已被拒绝。",
			"error.no-live-session": "该会话没有运行中的 agent，无法停止它的后台任务。",
			"error.job-not-found": "该后台任务已不存在。",
			"error.kill-failed": "停止任务失败：{message}",
			"error.unreachable": "无法连接主机：{message}",
			"error.unknown": "停止任务失败：{message}"
		};
		/** English dictionary, key-identical to the Chinese source of truth. */
		const en = {
			"count.live.one": "{count} background job running",
			"count.live.other": "{count} background jobs running",
			"count.idle.one": "{count} background job",
			"count.idle.other": "{count} background jobs",
			"list.aria": "Background jobs",
			"status.running": "running",
			"status.stopping": "stopping",
			"status.completed": "completed",
			"status.killed": "cancelled",
			"status.failed": "failed",
			"duration.seconds": "{seconds}s",
			"duration.minutes": "{minutes}m {seconds}s",
			"duration.hours": "{hours}h {minutes}m",
			"duration.title.live": "Running for {duration}",
			"duration.title.done": "Took {duration}",
			"stop.tooltip": "Stop this background job",
			"stop.aria": "Stop background job: {label}",
			"confirm.title": "Stop this background job?",
			"confirm.lead": "This cancels the job immediately. Work in progress is lost.",
			"confirm.action": "Stop job",
			"field.command": "Command",
			"field.kind": "Kind",
			"field.status": "Status",
			"field.elapsed": "Elapsed",
			"field.id": "Job id",
			"cancel": "Cancel",
			"close": "Close",
			"error.invalid-request": "The stop request was malformed and was rejected.",
			"error.no-live-session": "This session has no running agent, so its background jobs cannot be stopped.",
			"error.job-not-found": "That background job no longer exists.",
			"error.kill-failed": "Could not stop the job: {message}",
			"error.unreachable": "Could not reach the host: {message}",
			"error.unknown": "Could not stop the job: {message}"
		};
		//#endregion
		//#region src/client/index.ts
		/** Required services: the Session mirror, the slot registry, and copy. */
		const inject = [
			"sessions",
			"slots",
			"locale"
		];
		/**
		* Client plugin body: register the dictionaries and the header action.
		* @param ctx - client root context.
		*/
		function apply(ctx) {
			ctx.effect(() => ctx.locale.register(NS, {
				zh,
				en
			}), "job-stop: dictionaries");
			ctx.slots.inject("conversation.session.header.actions", () => ctx.slots.register({
				name: "conversation.session.header.actions",
				id: "job-list",
				priority: -1,
				locale: NS
			}, JobStopAction));
		}
		//#endregion
		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	}
});

//# sourceMappingURL=client.js.map