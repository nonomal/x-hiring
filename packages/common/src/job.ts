export function formatJobTitle(
  workType: string | null | undefined,
  title: string | null | undefined,
) {
  const normalizedType = workType?.trim();
  const normalizedTitle = title?.trim();

  if (!normalizedTitle) return normalizedType ?? "未命名职位";
  return normalizedTitle;
}
