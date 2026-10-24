import React, { Component, ReactNode, ErrorInfo } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error in component:', error, errorInfo);
  }

  handleReload = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      const isNetworkError = this.state.error?.message.includes('fetch') || 
                             this.state.error?.message.includes('Firebase') ||
                             this.state.error?.message.includes('module');

      return (
        <div className="w-full py-16 px-6 flex flex-col items-center justify-center text-center space-y-6 bg-white rounded-3xl border-2 border-dashed border-rose-200 shadow-xl my-8" dir="rtl">
          <div className="w-24 h-24 rounded-full bg-rose-50 text-rose-500 flex items-center justify-center text-5xl shadow-inner border border-rose-100">
            {isNetworkError ? '🌐' : '⚠️'}
          </div>
          <div className="space-y-3">
            <h2 className="text-2xl font-black text-slate-900">
              {isNetworkError ? 'کێشەیەک لە پەیوەندی سێرڤەر یان فایەربەیز ڕوویدا' : 'هەڵەیەکی نەخوازراو ڕوویدا'}
            </h2>
            <p className="text-sm text-slate-600 max-w-sm mx-auto leading-relaxed">
              {isNetworkError 
                ? 'تکایە دڵنیابە لە پەیوەندی ئینتەرنێتەکەت و پەڕەکە نوێ بکەرەوە. ئەگەر کێشەکە بەردەوام بوو، کەمێک چاوەڕێ بکە.'
                : 'تکایە پەڕەکە نوێ بکەرەوە، ئەگەر کێشەکە بەردەوام بوو تکایە پەیوەندی بە بەڕێوبەر بکە.'}
            </p>
          </div>
          <div className="flex items-center gap-3 mt-4">
            <button
              onClick={this.handleReload}
              className="px-8 py-4 bg-slate-900 hover:bg-slate-800 text-white font-black text-sm rounded-2xl shadow-xl transition-all active:scale-95 cursor-pointer flex items-center gap-2"
            >
              🔄 دووبارە هەوڵ بدەوە (ڕیفرێش)
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
