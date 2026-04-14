export interface Session {
  id: string;
  cwd: string;
  label: string;
  conversationId?: string;
  status: 'active' | 'idle' | 'stopped';
  lastActivityAt: number;
}

export interface OutgoingMessage {
  action: 'send_message';
  sessionId: string;
  message: string;
}

export interface OutgoingAction {
  action: 'set_sticky' | 'set_label';
  sessionId: string;
  value?: string;
}

declare global {
  interface Window {
    Telegram: {
      WebApp: {
        ready: () => void;
        expand: () => void;
        close: () => void;
        sendData: (data: string) => void;
        initDataUnsafe: {
          start_param?: string;
          query_id?: string;
        };
        themeParams: {
          bg_color?: string;
          text_color?: string;
          hint_color?: string;
          link_color?: string;
          button_color?: string;
          button_text_color?: string;
          secondary_bg_color?: string;
          header_bg_color?: string;
          section_bg_color?: string;
          accent_text_color?: string;
          section_separator_color?: string;
          subtitle_text_color?: string;
          destructive_text_color?: string;
        };
        MainButton: {
          text: string;
          color: string;
          textColor: string;
          isVisible: boolean;
          isActive: boolean;
          show: () => void;
          hide: () => void;
          enable: () => void;
          disable: () => void;
          showProgress: (leaveActive?: boolean) => void;
          hideProgress: () => void;
          onClick: (callback: () => void) => void;
          offClick: (callback: () => void) => void;
          setText: (text: string) => void;
        };
        BackButton: {
          isVisible: boolean;
          show: () => void;
          hide: () => void;
          onClick: (callback: () => void) => void;
          offClick: (callback: () => void) => void;
        };
        colorScheme: 'light' | 'dark';
        headerColor: string;
        backgroundColor: string;
        isExpanded: boolean;
        viewportHeight: number;
        viewportStableHeight: number;
      };
    };
  }
}
