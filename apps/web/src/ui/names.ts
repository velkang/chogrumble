/** "CHOG #1462" reads as "#1462" in tight spots. */
export const shortName = (name: string) => name.replace(/^CHOG\s*/i, '');
