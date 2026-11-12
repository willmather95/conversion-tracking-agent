export function guardLeadSubmit(
  submitting: { current: boolean },
  event: { preventDefault(): void },
  onFirst: () => void,
): void {
  if (submitting.current) {
    event.preventDefault();
    return;
  }
  submitting.current = true;
  onFirst();
}
