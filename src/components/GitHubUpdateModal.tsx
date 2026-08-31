import React, { useState, useEffect, useCallback } from 'react';
import { 
  GitBranch, 
  GitPullRequest, 
  Download, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  Copy, 
  Check, 
  ExternalLink, 
  X, 
  Terminal, 
  Sparkles,
  Layers,
  Clock,
  User,
  HelpCircle,
  Zap
} from 'lucide-react';
import { Language } from '../i18n';

export interface GitHubUpdateModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: Language;
  hasNewUpdate?: boolean;
  onUpdateDetected?: (hasUpdate: boolean, commitInfo: CommitInfo | null) => void;
}

export interface CommitInfo {
  sha: string;
  shortSha: string;
  message: string;
  author: string;
  date: string;
  url: string;
}

export const GitHubUpdateModal: React.FC<GitHubUpdateModalProps> = ({
  isOpen,
  onClose,
  lang,
  onUpdateDetected
}) => {
  const isHe = lang === 'he';

  // Stored repository target
  const [repoInput, setRepoInput] = useState<string>(() => {
    return localStorage.getItem('retroviz_github_repo') || 'shaicli888/retroviz-studio';
  });

  const [lastKnownSha, setLastKnownSha] = useState<string>(() => {
    return localStorage.getItem('retroviz_local_commit_sha') || '';
  });

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [latestCommit, setLatestCommit] = useState<CommitInfo | null>(null);
  const [hasNewUpdate, setHasNewUpdate] = useState<boolean>(false);
  const [copiedCmd, setCopiedCmd] = useState<boolean>(false);
  const [justUpdatedFeedback, setJustUpdatedFeedback] = useState<boolean>(false);

  // Check for updates on mount or when repo changes
  const checkForUpdates = useCallback(async (repoName: string = repoInput) => {
    const cleanRepo = repoName.trim().replace(/^https:\/\/github\.com\//, '').replace(/\.git$/, '');
    if (!cleanRepo || !cleanRepo.includes('/')) {
      setError(isHe ? 'נא להזין שם מאגר בפורמט: username/repository' : 'Please enter repository in format: username/repository');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch(`https://api.github.com/repos/${cleanRepo}/commits?per_page=1`, {
        headers: {
          'Accept': 'application/vnd.github.v3+json',
        }
      });

      if (!res.ok) {
        if (res.status === 404) {
          throw new Error(isHe ? 'המאגר ב-GitHub לא נמצא או שהוא פרטי.' : 'Repository not found or is private.');
        } else if (res.status === 403) {
          throw new Error(isHe ? 'הגעת למגבלת הקריאות של GitHub API. נסה שוב בעוד כמה דקות.' : 'GitHub API rate limit reached. Please wait a moment.');
        } else {
          throw new Error(`GitHub error: ${res.statusText}`);
        }
      }

      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        const commit = data[0];
        const sha = commit.sha;
        const info: CommitInfo = {
          sha,
          shortSha: sha.substring(0, 7),
          message: commit.commit.message.split('\n')[0],
          author: commit.commit.author.name || commit.author?.login || 'Developer',
          date: new Date(commit.commit.author.date).toLocaleString(isHe ? 'he-IL' : 'en-US', {
            dateStyle: 'medium',
            timeStyle: 'short',
          }),
          url: commit.html_url,
        };

        setLatestCommit(info);
        localStorage.setItem('retroviz_github_repo', cleanRepo);

        // If user already stored a local sha, compare
        const storedSha = localStorage.getItem('retroviz_local_commit_sha');
        if (storedSha && storedSha !== sha) {
          setHasNewUpdate(true);
          if (onUpdateDetected) onUpdateDetected(true, info);
        } else if (!storedSha) {
          setLastKnownSha(sha);
          localStorage.setItem('retroviz_local_commit_sha', sha);
          setHasNewUpdate(false);
          if (onUpdateDetected) onUpdateDetected(false, info);
        } else {
          setHasNewUpdate(false);
          if (onUpdateDetected) onUpdateDetected(false, info);
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to check GitHub');
    } finally {
      setIsLoading(false);
    }
  }, [repoInput, isHe, onUpdateDetected]);

  useEffect(() => {
    checkForUpdates(repoInput);
  }, []);

  useEffect(() => {
    if (isOpen) {
      checkForUpdates(repoInput);
    }
  }, [isOpen, checkForUpdates, repoInput]);

  const copyUpdateCommand = (cmd: string = 'npm run update') => {
    navigator.clipboard.writeText(cmd);
    setCopiedCmd(true);
    setTimeout(() => setCopiedCmd(false), 2500);
  };

  const applyUpdateNow = () => {
    copyUpdateCommand('npm run update');
    if (latestCommit) {
      setLastKnownSha(latestCommit.sha);
      localStorage.setItem('retroviz_local_commit_sha', latestCommit.sha);
      setHasNewUpdate(false);
      if (onUpdateDetected) onUpdateDetected(false, latestCommit);
    }
    setJustUpdatedFeedback(true);
    setTimeout(() => setJustUpdatedFeedback(false), 3000);
  };

  // Keyboard shortcut listener for 'Y' / 'y' key when modal is open
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
        return;
      }

      if (e.key === 'y' || e.key === 'Y' || e.key === 'ט') {
        e.preventDefault();
        applyUpdateNow();
      } else if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, latestCommit]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl bg-[#141417] border border-cyan-500/30 rounded-2xl shadow-2xl overflow-hidden flex flex-col text-[#E0E0E0]">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-white/5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
              <GitBranch size={18} className="text-white" />
            </div>
            <div>
              <h2 className="text-base font-black text-white flex items-center gap-2">
                {isHe ? 'סנכרון ועדכון אוטומטי מ-GitHub' : 'GitHub Sync & Auto Updater'}
                {hasNewUpdate && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500 text-black font-bold uppercase tracking-wider animate-pulse">
                    {isHe ? 'עדכון זמין' : 'New Update'}
                  </span>
                )}
              </h2>
              <p className="text-xs text-gray-400">
                {isHe ? 'עדכון מהיר בלחיצה אחת או בלחיצה על מקש Y' : '1-click update workflow or press [Y] key'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 flex flex-col gap-5 max-h-[80vh] overflow-y-auto custom-scrollbar">
          
          {/* Main Action Banner: Press Y to Update */}
          <div className="p-4 rounded-xl bg-gradient-to-r from-cyan-950/60 via-indigo-950/60 to-purple-950/60 border border-cyan-500/40 shadow-xl flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-400 flex items-center justify-center text-cyan-300 font-mono font-black text-lg shadow-inner">
                Y
              </div>
              <div className="min-w-0">
                <div className="text-xs font-black text-white flex items-center gap-1.5">
                  <Zap size={13} className="text-yellow-400" />
                  <span>{isHe ? 'לחץ על מקש [Y] לעדכון מיידי' : 'Press [Y] Key for Instant Update'}</span>
                </div>
                <div className="text-[10px] text-cyan-300/80 truncate">
                  {isHe ? 'מעדכן את גרסת הפרויקט ומעתיק את פקודת העדכון למחשב' : 'Syncs project version & copies update command'}
                </div>
              </div>
            </div>

            <button
              onClick={applyUpdateNow}
              className="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-black font-black text-xs rounded-lg shadow-md shadow-cyan-500/20 transition-all flex items-center gap-1.5 shrink-0 cursor-pointer active:scale-95"
            >
              {justUpdatedFeedback ? (
                <>
                  <Check size={14} className="text-black" />
                  <span>{isHe ? 'מעודכן!' : 'Updated!'}</span>
                </>
              ) : (
                <>
                  <RefreshCw size={13} />
                  <span>{isHe ? 'עדכן עכשיו [Y]' : 'Update Now [Y]'}</span>
                </>
              )}
            </button>
          </div>

          {/* GitHub Repo Selector / Config */}
          <div className="bg-white/5 border border-white/10 rounded-xl p-4 flex flex-col gap-3">
            <label className="text-xs font-bold text-gray-300 flex items-center justify-between">
              <span>{isHe ? 'כתובת המאגר ב-GitHub (Repository):' : 'Target GitHub Repository:'}</span>
              <span className="text-[10px] text-cyan-400 font-mono">owner/repo</span>
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={repoInput}
                onChange={(e) => setRepoInput(e.target.value)}
                placeholder="username/repository"
                className="flex-1 bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-xs font-mono text-cyan-300 focus:outline-none focus:border-cyan-500 transition-colors"
              />
              <button
                onClick={() => checkForUpdates(repoInput)}
                disabled={isLoading}
                className="px-4 py-2 bg-white/10 hover:bg-white/15 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 transition-all disabled:opacity-50 cursor-pointer"
              >
                <RefreshCw size={13} className={isLoading ? "animate-spin" : ""} />
                <span>{isHe ? 'בדוק עדכונים' : 'Check Now'}</span>
              </button>
            </div>
          </div>

          {/* Status Alert or Error */}
          {error && (
            <div className="p-3 bg-red-500/15 border border-red-500/30 rounded-xl flex items-center gap-3 text-red-200 text-xs">
              <AlertCircle size={16} className="text-red-400 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Update Status Card */}
          {latestCommit && (
            <div className={`p-4 rounded-xl border transition-all ${
              hasNewUpdate 
                ? 'bg-cyan-500/10 border-cyan-500/40 shadow-lg shadow-cyan-500/10' 
                : 'bg-emerald-500/10 border-emerald-500/30'
            }`}>
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex items-center gap-2">
                  {hasNewUpdate ? (
                    <Sparkles size={16} className="text-cyan-400 shrink-0 animate-bounce" />
                  ) : (
                    <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
                  )}
                  <span className={`text-xs font-bold ${hasNewUpdate ? 'text-cyan-300' : 'text-emerald-300'}`}>
                    {hasNewUpdate 
                      ? (isHe ? '🎉 קיים עדכון חדש ב-GitHub!' : '🎉 New Update Available on GitHub!')
                      : (isHe ? '✅ הפרויקט מעודכן לגרסה האחרונה' : '✅ Up to date with latest commit')}
                  </span>
                </div>
                
                <a
                  href={latestCommit.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] text-gray-400 hover:text-white flex items-center gap-1 transition-colors"
                >
                  <span className="font-mono">{latestCommit.shortSha}</span>
                  <ExternalLink size={11} />
                </a>
              </div>

              {/* Commit details */}
              <div className="text-xs text-white font-medium bg-black/40 p-2.5 rounded-lg border border-white/5 my-2">
                <p className="line-clamp-2">{latestCommit.message}</p>
                <div className="flex items-center gap-3 mt-2 text-[10px] text-gray-400">
                  <span className="flex items-center gap-1">
                    <User size={10} /> {latestCommit.author}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock size={10} /> {latestCommit.date}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Quick 1-Click Update Guides for Computer */}
          <div className="flex flex-col gap-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
              <Terminal size={13} className="text-cyan-400" />
              <span>{isHe ? 'כיצד לעדכן במחשב בלחיצה אחת' : '1-Click Local Update Methods'}</span>
            </h3>

            {/* Option A: Double-click update.bat / update.sh */}
            <div className="p-3 bg-white/5 border border-white/10 rounded-xl flex items-start gap-3">
              <div className="w-7 h-7 rounded-lg bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center shrink-0 text-indigo-300 font-bold text-xs mt-0.5">
                1
              </div>
              <div className="flex-1">
                <div className="text-xs font-bold text-white mb-0.5">
                  {isHe ? 'קובץ עדכון אוטומטי (לחיצה כפולה):' : 'Automatic Updater Script (Double-Click):'}
                </div>
                <p className="text-[11px] text-gray-300 leading-relaxed mb-2">
                  {isHe 
                    ? 'בתוך תיקיית הפרויקט במחשב קיים קובץ מוכן עבורך. פשוט לחץ עליו פעמיים והוא ימשוך את כל השינויים ויעדכן הכל אוטומטית!'
                    : 'In your project folder, double-click the updater file to instantly pull changes and install dependencies:'}
                </p>
                <div className="flex flex-wrap gap-2 text-[11px] font-mono">
                  <span className="px-2.5 py-1 rounded bg-black/60 border border-cyan-500/40 text-cyan-300 flex items-center gap-1">
                    🪟 Windows: <strong>update.bat</strong>
                  </span>
                  <span className="px-2.5 py-1 rounded bg-black/60 border border-indigo-500/40 text-indigo-300 flex items-center gap-1">
                    🍏 Mac / Linux: <strong>./update.sh</strong>
                  </span>
                </div>
              </div>
            </div>

            {/* Option B: Terminal Command */}
            <div className="p-3 bg-white/5 border border-white/10 rounded-xl flex items-start gap-3">
              <div className="w-7 h-7 rounded-lg bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center shrink-0 text-cyan-300 font-bold text-xs mt-0.5">
                2
              </div>
              <div className="flex-1">
                <div className="text-xs font-bold text-white mb-1">
                  {isHe ? 'או דרך שורת הפקודה (Terminal / CMD):' : 'Or via Terminal / CMD:'}
                </div>
                <div className="flex items-center justify-between bg-black/60 border border-white/10 rounded-lg p-2 font-mono text-xs text-cyan-300">
                  <span>npm run update</span>
                  <button
                    onClick={() => copyUpdateCommand('npm run update')}
                    className="px-2.5 py-1 bg-white/10 hover:bg-white/20 text-white rounded text-[10px] flex items-center gap-1 transition-all cursor-pointer"
                  >
                    {copiedCmd ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}
                    <span>{copiedCmd ? (isHe ? 'הועתק!' : 'Copied!') : (isHe ? 'העתק' : 'Copy')}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Workflow explanation banner */}
          <div className="p-3 bg-indigo-950/25 border border-indigo-500/30 rounded-xl text-[11px] text-indigo-200 flex items-start gap-2.5 leading-relaxed">
            <HelpCircle size={15} className="text-indigo-400 shrink-0 mt-0.5" />
            <div>
              <strong className="block text-white mb-0.5">
                {isHe ? 'זרימת העבודה המושלמת שלכם:' : 'Your Seamless Workflow:'}
              </strong>
              {isHe 
                ? '1. מבצעים שיפורים וסגנונות חדשים בצ\'ט 💬 -> 2. דוחפים לגטאהב (Export/Push to GitHub) 🚀 -> 3. לוחצים על מקש Y או על update.bat במחשב 💻 -> הפרויקט מתעדכן תוך שניות!'
                : '1. Chat & build improvements 💬 -> 2. Export/Push to GitHub 🚀 -> 3. Press [Y] or run update.bat on PC 💻 -> Visualizer updates in seconds!'}
            </div>
          </div>

        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 border-t border-white/10 bg-white/5 flex items-center justify-between">
          <div className="text-[11px] text-gray-400 font-mono">
            RetroViz Studio v1.2
          </div>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-black font-bold text-xs rounded-xl shadow-lg shadow-cyan-500/20 transition-all cursor-pointer"
          >
            {isHe ? 'סגור' : 'Close'}
          </button>
        </div>

      </div>
    </div>
  );
};
