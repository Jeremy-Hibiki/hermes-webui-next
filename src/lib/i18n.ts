type TranslationCatalog = Record<string, Record<string, string>>;

const en: Record<string, string> = {
  'app.title': 'Hermes',
  'app.tagline': 'Your AI Assistant',
  'chat.placeholder': 'Type a message...',
  'chat.send': 'Send',
  'chat.cancel': 'Cancel',
  'session.new': 'New Chat',
  'session.search': 'Search sessions...',
  'settings.title': 'Settings',
  'settings.theme': 'Theme',
  'settings.skin': 'Skin',
  'settings.fontSize': 'Font Size',
  'auth.password': 'Password',
  'auth.login': 'Login',
  'auth.logout': 'Logout',
  'workspace.title': 'Workspace',
  'workspace.empty': 'Empty directory',
  'cron.title': 'Cron Jobs',
  'skills.title': 'Skills',
  'memory.title': 'Memory',
  'todo.title': 'Todo',
  'insights.title': 'Insights',
  'kanban.title': 'Kanban',
  'terminal.title': 'Terminal',
  'offline.title': 'You are offline',
  'offline.retry': 'Retry',
};

const zh: Record<string, string> = {
  'app.title': 'Hermes',
  'app.tagline': '你的 AI 助手',
  'chat.placeholder': '输入消息...',
  'chat.send': '发送',
  'chat.cancel': '取消',
  'session.new': '新建对话',
  'session.search': '搜索会话...',
  'settings.title': '设置',
  'settings.theme': '主题',
  'settings.skin': '皮肤',
  'settings.fontSize': '字体大小',
  'auth.password': '密码',
  'auth.login': '登录',
  'auth.logout': '退出',
  'workspace.title': '工作区',
  'workspace.empty': '空目录',
  'cron.title': '定时任务',
  'skills.title': '技能',
  'memory.title': '记忆',
  'todo.title': '待办',
  'insights.title': '洞察',
  'kanban.title': '看板',
  'terminal.title': '终端',
  'offline.title': '你已离线',
  'offline.retry': '重试',
};

const catalogs: TranslationCatalog = { en, zh };

let currentLocale = 'en';

export function getLocale(): string {
  return currentLocale;
}

export function setLocale(locale: string): void {
  if (catalogs[locale]) {
    currentLocale = locale;
  }
}

export function t(key: string): string {
  return catalogs[currentLocale]?.[key] ?? catalogs.en?.[key] ?? key;
}

export const i18n = { t, setLocale, getLocale };
