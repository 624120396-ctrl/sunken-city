export type AuthPortalMode = 'login' | 'register';

export interface AuthSubmitLabelInput {
  mode: AuthPortalMode;
  loading: boolean;
}

export function getAuthSubmitLabel(input: AuthSubmitLabelInput): string {
  if (input.mode === 'login') {
    return input.loading ? '连接中...' : '揭开帷幕';
  }

  return input.loading ? '缔结契约...' : '接受召唤';
}
