declare const __SUNKEN_CITY_VERSION__: string;
declare const __SUNKEN_CITY_CHANGELOG__: string;

export const productVersion = __SUNKEN_CITY_VERSION__;

function parseReleaseNotes(changelog: string) {
  return changelog
    .split(/^## \[/m)
    .slice(1)
    .map(section => {
      const [header, ...body] = section.split('\n');
      const versionMatch = header.match(/^(\d+\.\d+\.\d+)\]\s*-\s*(\d{4}-\d{2}-\d{2})/);
      if (!versionMatch) return null;

      const content = body.join('\n');
      const title = content.match(/^### .*?版本代号[:：]\s*(.+)$/m)?.[1]?.trim() || '版本更新';
      const items = [...content.matchAll(/^- \*\*(.+?)\*\*[:：]\s*(.+)$/gm)]
        .slice(0, 4)
        .map(match => `${match[1]}：${match[2]}`);

      return { version: versionMatch[1], date: versionMatch[2], title, items };
    })
    .filter((note): note is { version: string; date: string; title: string; items: string[] } => Boolean(note))
    .slice(0, 3);
}

export const releaseNotes = parseReleaseNotes(__SUNKEN_CITY_CHANGELOG__);
