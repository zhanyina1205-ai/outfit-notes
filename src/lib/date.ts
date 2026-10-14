export function today() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}
export function dateOffset(offset: number) {
  const date = new Date(`${today()}T12:00:00+08:00`);
  date.setUTCDate(date.getUTCDate() + offset);
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}
export function displayDate(date = today()) {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "long",
    day: "numeric",
    weekday: "long",
    timeZone: "Asia/Shanghai",
  }).format(new Date(`${date}T12:00:00+08:00`));
}
export const id = () => crypto.randomUUID();
export const compact = (number: number) =>
  number >= 10000
    ? `${(number / 10000).toFixed(1)}万`
    : number.toLocaleString("zh-CN");
