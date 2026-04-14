import { DEFAULT_NOTIFICATION_SETTINGS } from "./constantes.js";
import { isRoutineDueOn, td } from "./utilidades.js";
import { Capacitor } from "@capacitor/core";
import { LocalNotifications } from "@capacitor/local-notifications";

const STORAGE_KEY = "gestaoProjetos.notifications.fired";
const NATIVE_IDS_KEY = "gestaoProjetos.notifications.nativeIds";
const scheduledTimers = new Map();
let nativeListener = null;

function readFiredIds() {
  try {
    return new Set(JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"));
  } catch {
    return new Set();
  }
}

function markFired(id) {
  const fired = readFiredIds();
  fired.add(id);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...fired].slice(-500)));
  } catch {
    /* best effort */
  }
}

function notificationNumberId(id) {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = ((hash << 5) - hash + id.charCodeAt(i)) | 0;
  }
  return Math.abs(hash) || 1;
}

function isNativeNotifications() {
  return Capacitor.isNativePlatform();
}

function readNativeIds() {
  try {
    return JSON.parse(localStorage.getItem(NATIVE_IDS_KEY) || "[]");
  } catch {
    return [];
  }
}

function writeNativeIds(ids) {
  try {
    localStorage.setItem(NATIVE_IDS_KEY, JSON.stringify(ids.slice(-500)));
  } catch {
    /* best effort */
  }
}

async function cancelNativeNotifications() {
  const ids = readNativeIds();
  if (!ids.length) return;
  try {
    await LocalNotifications.cancel({ notifications: ids.map(id => ({ id })) });
  } catch {
    /* best effort */
  }
  writeNativeIds([]);
}

function dateTime(date, time, fallbackTime = "23:59") {
  if (!date) return null;
  const t = time || fallbackTime;
  const d = new Date(date + "T" + t + ":00");
  return Number.isNaN(d.getTime()) ? null : d;
}

function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function toDateStr(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function isInQuietHours(date, settings) {
  if (!settings.quietHoursEnabled || !settings.quietHoursStart || !settings.quietHoursEnd) return false;
  const minutes = date.getHours() * 60 + date.getMinutes();
  const [sh, sm] = settings.quietHoursStart.split(":").map(Number);
  const [eh, em] = settings.quietHoursEnd.split(":").map(Number);
  const start = (sh || 0) * 60 + (sm || 0);
  const end = (eh || 0) * 60 + (em || 0);
  if (start === end) return false;
  if (start < end) return minutes >= start && minutes < end;
  return minutes >= start || minutes < end;
}

function futureAndAllowed(when, now, settings, firedIds, id) {
  return when && when.getTime() > now.getTime() && !isInQuietHours(when, settings) && !firedIds.has(id);
}

function taskNotifications(task, settings, now, firedIds, prefix = "task", extra = {}) {
  if (!task || task.status === "Concluida" || task.status === "Concluída" || task.status === "Arquivada") return [];
  const out = [];
  const label = task.name || "Atividade";

  if (task.notificationEnabled && task.notificationDate && task.notificationTime) {
    const id = `${prefix}:${task.id}:manual:${task.notificationDate}:${task.notificationTime}`;
    const when = dateTime(task.notificationDate, task.notificationTime);
    if (futureAndAllowed(when, now, settings, firedIds, id)) {
      out.push({
        id,
        when,
        title: "Lembrete",
        body: label,
        target: { type: prefix === "projectTask" ? "projectTask" : "task", id: task.id, ...extra },
      });
    }
  }

  if (settings.taskDeadlineNoticeEnabled && task.deadline) {
    const deadline = dateTime(task.deadline, task.deadlineTime);
    if (deadline) {
      const hours = Math.max(0, Number(settings.taskDeadlineNoticeHours || 0));
      const when = new Date(deadline.getTime() - hours * 60 * 60 * 1000);
      const id = `${prefix}:${task.id}:deadline:${task.deadline}:${task.deadlineTime || "23:59"}:${hours}`;
      if (futureAndAllowed(when, now, settings, firedIds, id)) {
        out.push({
          id,
          when,
          title: "Prazo chegando",
          body: label,
          target: { type: prefix === "projectTask" ? "projectTask" : "task", id: task.id, ...extra },
        });
      }
    }
  }

  return out;
}

function nextRoutineDates(routine, now, horizonDays = 31) {
  if (!routine?.notificationEnabled || !routine.notificationTime || routine.status === "Desativada") return [];
  const out = [];
  for (let i = 0; i < horizonDays; i++) {
    const candidate = addDays(now, i);
    const dateStr = toDateStr(candidate);
    if (!isRoutineDueOn(routine, dateStr)) continue;
    const when = dateTime(dateStr, routine.notificationTime);
    if (when && when.getTime() > now.getTime()) out.push(when);
  }
  return out;
}

function routineNotifications(routine, settings, now, firedIds) {
  if (!routine || routine.status !== "Ativa") return [];
  return nextRoutineDates(routine, now)
    .map(when => {
      const dateStr = toDateStr(when);
      const id = `routine:${routine.id}:manual:${dateStr}:${routine.notificationTime}`;
      if (!futureAndAllowed(when, now, settings, firedIds, id)) return null;
      return {
        id,
        when,
        title: "Rotina",
        body: routine.name || "Rotina pendente",
        target: { type: "routine", id: routine.id },
      };
    })
    .filter(Boolean);
}

export function countDayClosingPending({ tasks = [], projects = [], routines = [], date = td() }) {
  const taskCount = tasks.filter(t => t.status === "Pendente" && t.deadline === date).length;
  const projectTaskCount = projects
    .filter(p => p.status === "Ativo")
    .flatMap(p => (p.phases || []).flatMap(ph => ph.tasks || []))
    .filter(t => t.status !== "Concluída" && t.status !== "Concluida" && t.deadline === date)
    .length;
  const routineCount = routines.filter(r => r.status === "Ativa" && isRoutineDueOn(r, date)).length;
  return taskCount + projectTaskCount + routineCount;
}

export function buildNotificationPlan({ profile = {}, tasks = [], projects = [], routines = [], now = new Date() }) {
  const settings = { ...DEFAULT_NOTIFICATION_SETTINGS, ...(profile.notificationSettings || {}) };
  if (!settings.notificationsEnabled) return [];

  const firedIds = readFiredIds();
  const out = [];

  tasks.forEach(task => out.push(...taskNotifications(task, settings, now, firedIds)));
  projects
    .filter(project => project.status === "Ativo")
    .forEach(project => {
      (project.phases || []).forEach(phase => {
        (phase.tasks || []).forEach(task => {
          out.push(...taskNotifications(task, settings, now, firedIds, "projectTask", {
            projectId: project.id,
            phaseId: phase.id,
          }));
        });
      });
    });
  routines.forEach(routine => out.push(...routineNotifications(routine, settings, now, firedIds)));

  if (settings.dayClosingNotificationEnabled && settings.dayClosingNotificationTime) {
    const today = td();
    const pending = countDayClosingPending({ tasks, projects, routines, date: today });
    const when = dateTime(today, settings.dayClosingNotificationTime);
    const id = `dayClosing:${today}`;
    if (pending > 0 && futureAndAllowed(when, now, settings, firedIds, id)) {
      out.push({
        id,
        when,
        title: "Fechamento do dia",
        body: `Voce ainda tem ${pending} atividade${pending === 1 ? "" : "s"} pendente${pending === 1 ? "" : "s"} hoje`,
        target: { type: "dayClosing" },
      });
    }
  }

  return out.sort((a, b) => a.when.getTime() - b.when.getTime());
}

export function getNotificationPermission() {
  if (isNativeNotifications()) return "native";
  if (!("Notification" in window)) return "unsupported";
  return Notification.permission;
}

export async function requestNotificationPermission() {
  if (isNativeNotifications()) {
    const current = await LocalNotifications.checkPermissions();
    if (current.display === "granted") return "granted";
    const requested = await LocalNotifications.requestPermissions();
    return requested.display;
  }
  if (!("Notification" in window)) return "unsupported";
  if (Notification.permission === "granted") return "granted";
  if (Notification.permission === "denied") return "denied";
  return Notification.requestPermission();
}

async function scheduleNativeNotificationPlan(plan, onOpen) {
  const permission = await requestNotificationPermission();
  if (permission !== "granted") return;
  await cancelNativeNotifications();
  if (nativeListener) {
    await nativeListener.remove();
    nativeListener = null;
  }
  nativeListener = await LocalNotifications.addListener("localNotificationActionPerformed", event => {
    const target = event.notification?.extra?.target;
    if (onOpen && target) onOpen(target);
  });
  const notifications = plan.map(item => ({
    id: notificationNumberId(item.id),
    title: item.title,
    body: item.body,
    schedule: { at: item.when },
    extra: { target: item.target, planId: item.id },
  }));
  if (!notifications.length) return;
  await LocalNotifications.schedule({ notifications });
  writeNativeIds(notifications.map(n => n.id));
}

export function scheduleNotificationPlan(plan, onOpen) {
  scheduledTimers.forEach(timer => clearTimeout(timer));
  scheduledTimers.clear();

  if (isNativeNotifications()) {
    scheduleNativeNotificationPlan(plan, onOpen);
    return;
  }

  if (!("Notification" in window) || Notification.permission !== "granted") return;

  const now = Date.now();
  plan.forEach(item => {
    const delay = item.when.getTime() - now;
    if (delay <= 0 || delay > 2147483647) return;
    const timer = setTimeout(() => {
      markFired(item.id);
      const n = new Notification(item.title, {
        body: item.body,
        tag: item.id,
        renotify: false,
      });
      n.onclick = () => {
        window.focus();
        if (onOpen) onOpen(item.target);
        n.close();
      };
      scheduledTimers.delete(item.id);
    }, delay);
    scheduledTimers.set(item.id, timer);
  });
}

export function clearScheduledNotifications() {
  scheduledTimers.forEach(timer => clearTimeout(timer));
  scheduledTimers.clear();
  if (isNativeNotifications()) {
    cancelNativeNotifications();
  }
}
