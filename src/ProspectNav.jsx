import React, { useState } from 'react';
import {
  Globe, Mail, Users, Loader2, Plus, Trash2, TrendingUp, Target,
  Building2, FileText, Search, Zap, BarChart3, Phone,
  CheckCircle, ChevronLeft, ChevronRight, ArrowRight, AlertCircle, LogOut, Shield,
} from 'lucide-react';
import { useAuthContext } from './components/AuthProvider';
import { useAccounts } from './hooks/useAccounts';

// ─── Content Renderer ──────────────────────────────────────────────────────────
function ContentRenderer({ text }) {
  if (!text) {
    return (
      <div className="flex items-center justify-center h-40">
        <p className="text-slate-500 italic text-sm">No content available.</p>
      </div>
    );
  }

  const lines = text.split('\n');
  const elements = [];
  let i = 0;
  let k = 0;
  const key = () => k++;

  while (i < lines.length) {
    const raw = lines[i];
    const trimmed = raw.trim();

    if (!trimmed) { i++; continue; }

    // Section header: mostly uppercase, no leading digit, short enough to be a heading
    const isHeader =
      /^[A-Z0-9 :_\-\/\(\)&]{4,}$/.test(trimmed) &&
      /[A-Z]{3,}/.test(trimmed) &&
      !/^\d+\./.test(trimmed) &&
      trimmed.length < 80;

    if (isHeader) {
      elements.push(
        <div key={key()} className="pt-7 pb-2 first:pt-0">
          <p className="text-[10px] font-bold tracking-widest text-teal-400 uppercase">
            {trimmed.replace(/:$/, '')}
          </p>
          <div className="h-px bg-slate-700/60 mt-2" />
        </div>
      );
      i++;
      continue;
    }

    // Numbered item
    const numMatch = trimmed.match(/^(\d+)\.\s*(.*)/);
    if (numMatch) {
      const num = numMatch[1];
      const title = numMatch[2];
      i++;
      const subLines = [];
      while (
        i < lines.length &&
        lines[i].trim() !== '' &&
        !/^\d+\./.test(lines[i].trim()) &&
        !(/^[A-Z0-9 :_\-\/\(\)&]{4,}$/.test(lines[i].trim()) && /[A-Z]{3,}/.test(lines[i].trim()))
      ) {
        if (lines[i].trim()) subLines.push(lines[i].trim());
        i++;
      }
      elements.push(
        <div key={key()} className="mb-3 rounded-lg border border-slate-700/60 bg-slate-800/30 overflow-hidden">
          <div className="flex items-start gap-3 p-4">
            <span className="flex-shrink-0 w-5 h-5 rounded-full bg-teal-500 text-white text-[10px] font-bold flex items-center justify-center mt-0.5">
              {num}
            </span>
            <div className="flex-1 min-w-0">
              {title && <p className="text-white font-semibold text-sm mb-2">{title}</p>}
              {subLines.length > 0 && (
                <div className="space-y-1.5">
                  {subLines.map((sub, j) => {
                    const cleaned = sub.replace(/^[•\-\*]\s*/, '');
                    const colonIdx = cleaned.indexOf(':');
                    if (colonIdx > 0 && colonIdx < 32 && !cleaned.startsWith('http')) {
                      const label = cleaned.slice(0, colonIdx).trim();
                      const value = cleaned.slice(colonIdx + 1).trim();
                      return (
                        <div key={j} className="flex gap-2 text-xs">
                          <span className="text-teal-300 font-medium shrink-0">{label}:</span>
                          <span className="text-slate-300">{value}</span>
                        </div>
                      );
                    }
                    if (!cleaned) return null;
                    return (
                      <div key={j} className="flex items-start gap-2 text-xs text-slate-400">
                        <span className="text-slate-600 mt-1 shrink-0">–</span>
                        <span>{cleaned}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      );
      continue;
    }

    // Bullet list
    if (/^[•\-\*]/.test(trimmed)) {
      const bulletItems = [];
      while (i < lines.length && /^[•\-\*]/.test(lines[i].trim())) {
        bulletItems.push(lines[i].trim().replace(/^[•\-\*]\s*/, ''));
        i++;
      }
      elements.push(
        <ul key={key()} className="space-y-1.5 mb-3 pl-0.5">
          {bulletItems.filter(Boolean).map((item, j) => (
            <li key={j} className="flex items-start gap-2.5 text-sm text-slate-300">
              <span className="mt-2 h-1.5 w-1.5 rounded-full bg-teal-500 shrink-0" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      );
      continue;
    }

    // Labeled line: "Subject: ..." or "Why: ..."
    const labelMatch = trimmed.match(/^([A-Za-z][A-Za-z\s]{1,22}):\s(.+)/);
    if (labelMatch && labelMatch[1].split(' ').length <= 4) {
      elements.push(
        <div key={key()} className="flex gap-2 text-sm mb-1.5">
          <span className="text-slate-400 font-medium shrink-0">{labelMatch[1]}:</span>
          <span className="text-slate-200">{labelMatch[2]}</span>
        </div>
      );
      i++;
      continue;
    }

    // Regular paragraph
    elements.push(
      <p key={key()} className="text-sm text-slate-300 leading-relaxed mb-2">
        {trimmed}
      </p>
    );
    i++;
  }

  return <div>{elements}</div>;
}

// ─── Main Component ────────────────────────────────────────────────────────────
export default function ProspectNav() {
  const { user, profile, loading: authLoading, signIn, signUp, signOut } = useAuthContext();
  const { accounts, selectedAccount, setSelectedAccount, createAccount, deleteAccount } = useAccounts(user?.id);

  const [currentView, setCurrentView] = useState('landing');
  const [authMode, setAuthMode] = useState('signin');
  const [authError, setAuthError] = useState('');
  const [authSubmitting, setAuthSubmitting] = useState(false);

  const [activeTab, setActiveTab] = useState('objectives');
  const [isGenerating, setIsGenerating] = useState(false);
  const [completedSections, setCompletedSections] = useState(new Set());
  const [generationError, setGenerationError] = useState('');
  const [currentTestimonial, setCurrentTestimonial] = useState(0);

  const [signupData, setSignupData] = useState({
    email: '', password: '', companyName: '', userRole: '', valueProposition: '',
  });
  const [signinData, setSigninData] = useState({ email: '', password: '' });

  const [newAccountForm, setNewAccountForm] = useState({
    companyName: '', contactName: '', contactRole: '', industry: '',
  });

  // Redirect to generate when user logs in
  React.useEffect(() => {
    if (user && currentView === 'landing') setCurrentView('generate');
    if (user && currentView === 'auth') setCurrentView('generate');
    if (!user && (currentView === 'generate' || currentView === 'app')) setCurrentView('landing');
  }, [user]);

  const tabs = [
    { id: 'overview', label: 'Overview', icon: Building2 },
    { id: 'objectives', label: 'Objectives', icon: Target },
    { id: 'competitive', label: 'Competitive', icon: BarChart3 },
    { id: 'emails', label: 'Email Sequences', icon: Mail },
    { id: 'coldCall', label: 'Call Script', icon: Phone },
    { id: 'qualification', label: 'Discovery', icon: Search },
    { id: 'linkedin', label: 'LinkedIn', icon: Users },
    { id: 'insights', label: 'Insights', icon: TrendingUp },
  ];

  const SECTION_LABELS = {
    objectives: 'Analyzing business objectives',
    competitive: 'Running competitive intelligence',
    overview: 'Building company overview',
    insights: 'Researching industry trends',
    emails: 'Crafting email sequences',
    coldCall: 'Building call framework',
    qualification: 'Designing discovery questions',
    linkedin: 'Building LinkedIn strategy',
  };

  const testimonials = [
    { text: 'The content created is 90–95% ready to go and helps me engage with my unengaged accounts.', author: 'Enterprise AE, Fortune 500' },
    { text: "I was on a PIP before I started using ProspectNav. This quarter, I got promoted to Account Executive.", author: 'SDR, SaaS Company' },
    { text: "Since I started using ProspectNav, I've consistently led my team in meetings set.", author: 'BDR, Tech Startup' },
  ];

  // Show loading spinner while Supabase initializes session
  if (authLoading) {
    return (
      <div className="h-screen bg-slate-950 flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-teal-400 animate-spin" />
      </div>
    );
  }

  const handleSignIn = async (e) => {
    e.preventDefault();
    setAuthError('');
    setAuthSubmitting(true);
    try {
      await signIn(signinData.email, signinData.password);
      setCurrentView('generate');
    } catch (err) {
      setAuthError(err.message || 'Sign in failed');
    } finally {
      setAuthSubmitting(false);
    }
  };

  const handleSignUp = async (e) => {
    e.preventDefault();
    setAuthError('');
    setAuthSubmitting(true);
    try {
      await signUp(signupData.email, signupData.password, {
        companyName: signupData.companyName,
        userRole: signupData.userRole,
        valueProposition: signupData.valueProposition,
      });
      setCurrentView('generate');
    } catch (err) {
      setAuthError(err.message || 'Sign up failed');
    } finally {
      setAuthSubmitting(false);
    }
  };

  const handleGenerate = async () => {
    if (!newAccountForm.companyName) { alert('Please enter a company name'); return; }
    setIsGenerating(true);
    setCompletedSections(new Set());
    setGenerationError('');
    try {
      await createAccount(
        newAccountForm,
        profile,
        (sectionType) => {
          setCompletedSections((prev) => new Set([...prev, sectionType]));
        }
      );
      setNewAccountForm({ companyName: '', contactName: '', contactRole: '', industry: '' });
      setActiveTab('objectives');
      setCurrentView('app');
    } catch (err) {
      setGenerationError(err.message || 'Generation failed');
    } finally {
      setIsGenerating(false);
      setCompletedSections(new Set());
    }
  };

  const handleDeleteAccount = async (accountId) => {
    if (!confirm('Delete this account?')) return;
    try {
      await deleteAccount(accountId);
    } catch (err) {
      console.error('Delete failed:', err);
    }
  };

  // ─── Views ────────────────────────────────────────────────────────────────────

  const renderLanding = () => (
    <div className="flex-1 flex flex-col overflow-y-auto">
      <div className="flex-1 flex items-center justify-center px-8 py-20">
        <div className="max-w-3xl w-full text-center">
          <div className="inline-flex items-center gap-2 bg-teal-500/10 border border-teal-500/20 text-teal-400 px-3.5 py-1.5 rounded-full text-[11px] font-semibold mb-8 tracking-widest uppercase">
            <Shield className="w-3 h-3" />
            Enterprise Sales Intelligence
          </div>

          <h1 className="text-5xl md:text-6xl font-bold text-white mb-5 leading-tight tracking-tight">
            Turn any company into
            <br />
            <span className="text-teal-400">a closed deal</span>
          </h1>

          <p className="text-slate-400 text-lg mb-10 max-w-xl mx-auto leading-relaxed">
            AI-powered account research that generates company overviews, competitive analysis,
            and personalized outreach — in under 90 seconds.
          </p>

          <div className="flex items-center justify-center gap-4 mb-12">
            <button
              onClick={() => { setCurrentView('auth'); setAuthMode('signup'); }}
              className="bg-teal-500 hover:bg-teal-400 text-white font-semibold py-3 px-8 rounded-lg transition-all text-sm shadow-lg shadow-teal-500/20 flex items-center gap-2"
            >
              Start Free Trial <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => { setCurrentView('auth'); setAuthMode('signin'); }}
              className="text-slate-300 hover:text-white font-medium py-3 px-8 rounded-lg border border-slate-700 hover:border-slate-500 transition-all text-sm"
            >
              Sign In
            </button>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-6 text-xs text-slate-500 mb-16">
            {['12,000+ accounts researched', '95% content accuracy', '8 research modules', 'SOC 2 compliant'].map((s) => (
              <div key={s} className="flex items-center gap-1.5">
                <CheckCircle className="w-3.5 h-3.5 text-teal-500" />
                <span>{s}</span>
              </div>
            ))}
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            {[
              { icon: Globe, title: 'Web Intelligence', desc: 'Automated research from SEC filings, press releases, earnings calls, and public data sources.' },
              { icon: BarChart3, title: 'Competitive Analysis', desc: 'Real-time market positioning, battle cards, and differentiation strategy tailored to your prospect.' },
              { icon: Zap, title: 'Multi-Channel Outreach', desc: 'Production-ready emails, call scripts, LinkedIn messages, and MEDDPICC discovery questions.' },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="bg-slate-800/40 border border-slate-700/60 rounded-xl p-5 text-left hover:border-slate-600 transition-colors">
                <div className="w-8 h-8 rounded-lg bg-teal-500/10 flex items-center justify-center mb-3">
                  <Icon className="w-4 h-4 text-teal-400" />
                </div>
                <h3 className="text-white font-semibold text-sm mb-1.5">{title}</h3>
                <p className="text-slate-500 text-xs leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Testimonial bar */}
      <div className="border-t border-slate-800 py-5 px-8 bg-slate-900/40 shrink-0">
        <div className="max-w-2xl mx-auto flex items-center gap-4">
          <button
            onClick={() => setCurrentTestimonial((p) => (p - 1 + testimonials.length) % testimonials.length)}
            className="p-1 text-slate-600 hover:text-slate-400 transition-colors shrink-0"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div className="text-center flex-1">
            <p className="text-slate-300 text-sm italic mb-1">"{testimonials[currentTestimonial].text}"</p>
            <p className="text-slate-600 text-xs">{testimonials[currentTestimonial].author}</p>
          </div>
          <button
            onClick={() => setCurrentTestimonial((p) => (p + 1) % testimonials.length)}
            className="p-1 text-slate-600 hover:text-slate-400 transition-colors shrink-0"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );

  const renderAuth = () => (
    <div className="flex-1 flex overflow-hidden">
      {/* Left branding panel */}
      <div className="hidden lg:flex w-[45%] bg-gradient-to-br from-slate-800 to-slate-900 border-r border-slate-700/50 p-12 flex-col justify-between">
        <div>
          <div className="flex items-center gap-2 mb-12">
            <div className="w-7 h-7 rounded-lg bg-teal-500 flex items-center justify-center">
              <Globe className="w-4 h-4 text-white" />
            </div>
            <span className="text-white font-bold text-base tracking-tight">ProspectNav</span>
          </div>
          <h2 className="text-2xl font-bold text-white mb-3 leading-snug">
            Research any account<br />in under 90 seconds
          </h2>
          <p className="text-slate-400 text-sm leading-relaxed mb-8">
            Enterprise-grade sales intelligence powered by AI. Stop spending hours on research. Start closing deals.
          </p>
          <div className="space-y-3">
            {[
              'Company overview, financials & leadership',
              'Personalized email sequences (95% ready)',
              'MEDDPICC discovery framework',
              'Competitive battle cards',
              'Cold call and LinkedIn scripts',
            ].map((item) => (
              <div key={item} className="flex items-start gap-2.5">
                <CheckCircle className="w-4 h-4 text-teal-400 mt-0.5 shrink-0" />
                <span className="text-slate-300 text-sm">{item}</span>
              </div>
            ))}
          </div>
        </div>
        <p className="text-slate-600 text-xs">SOC 2 Type II Certified · GDPR Compliant</p>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex items-center justify-center p-8 overflow-y-auto">
        <div className="w-full max-w-sm">
          <div className="mb-7">
            <h2 className="text-xl font-bold text-white mb-1">
              {authMode === 'signin' ? 'Welcome back' : 'Create your account'}
            </h2>
            <p className="text-slate-500 text-sm">
              {authMode === 'signin' ? 'Sign in to continue to ProspectNav' : 'Start researching accounts in minutes'}
            </p>
          </div>

          <form onSubmit={authMode === 'signin' ? handleSignIn : handleSignUp} className="space-y-3.5">
            {authMode === 'signup' && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-500 mb-1.5 uppercase tracking-widest">Company</label>
                    <input
                      type="text"
                      value={signupData.companyName}
                      onChange={(e) => setSignupData({ ...signupData, companyName: e.target.value })}
                      placeholder="Acme Inc."
                      className="w-full bg-slate-800 border border-slate-700 text-white px-3 py-2.5 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent placeholder-slate-600"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-500 mb-1.5 uppercase tracking-widest">Your Role</label>
                    <input
                      type="text"
                      value={signupData.userRole}
                      onChange={(e) => setSignupData({ ...signupData, userRole: e.target.value })}
                      placeholder="Account Executive"
                      className="w-full bg-slate-800 border border-slate-700 text-white px-3 py-2.5 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent placeholder-slate-600"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-slate-500 mb-1.5 uppercase tracking-widest">Value Proposition</label>
                  <textarea
                    value={signupData.valueProposition}
                    onChange={(e) => setSignupData({ ...signupData, valueProposition: e.target.value })}
                    placeholder="We help companies reduce costs by 30% through AI automation..."
                    className="w-full bg-slate-800 border border-slate-700 text-white px-3 py-2.5 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent h-20 resize-none placeholder-slate-600"
                    required
                  />
                </div>
              </>
            )}

            <div>
              <label className="block text-[10px] font-semibold text-slate-500 mb-1.5 uppercase tracking-widest">Work Email</label>
              <input
                type="email"
                value={authMode === 'signin' ? signinData.email : signupData.email}
                onChange={(e) =>
                  authMode === 'signin'
                    ? setSigninData({ ...signinData, email: e.target.value })
                    : setSignupData({ ...signupData, email: e.target.value })
                }
                placeholder="you@company.com"
                className="w-full bg-slate-800 border border-slate-700 text-white px-3 py-2.5 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent placeholder-slate-600"
                required
              />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-slate-500 mb-1.5 uppercase tracking-widest">Password</label>
              <input
                type="password"
                value={authMode === 'signin' ? signinData.password : signupData.password}
                onChange={(e) =>
                  authMode === 'signin'
                    ? setSigninData({ ...signinData, password: e.target.value })
                    : setSignupData({ ...signupData, password: e.target.value })
                }
                placeholder="••••••••••"
                className="w-full bg-slate-800 border border-slate-700 text-white px-3 py-2.5 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent placeholder-slate-600"
                required
              />
            </div>

            {authError && (
              <div className="flex items-start gap-2 bg-red-900/20 border border-red-700/40 rounded-lg px-3 py-2.5">
                <AlertCircle className="w-3.5 h-3.5 text-red-400 shrink-0 mt-0.5" />
                <p className="text-red-300 text-xs">{authError}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={authSubmitting}
              className="w-full bg-teal-500 hover:bg-teal-400 disabled:bg-teal-700 disabled:cursor-not-allowed text-white font-semibold py-2.5 rounded-lg transition-colors text-sm flex items-center justify-center gap-2 mt-1"
            >
              {authSubmitting ? (
                <><Loader2 className="w-4 h-4 animate-spin" />{authMode === 'signin' ? 'Signing in...' : 'Creating account...'}</>
              ) : (
                <>{authMode === 'signin' ? 'Sign In' : 'Create Account'}<ArrowRight className="w-4 h-4" /></>
              )}
            </button>
          </form>

          <div className="mt-5 space-y-3 text-center">
            <button
              onClick={() => { setAuthMode(authMode === 'signin' ? 'signup' : 'signin'); setAuthError(''); }}
              className="text-teal-400 hover:text-teal-300 text-xs transition-colors"
            >
              {authMode === 'signin' ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
            </button>
            <br />
            <button onClick={() => setCurrentView('landing')} className="text-slate-600 hover:text-slate-400 text-xs transition-colors">
              Back to home
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  const renderGenerate = () => (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-2xl mx-auto px-6 py-10">
        <div className="mb-7">
          <h2 className="text-xl font-bold text-white mb-1">Generate Account Intelligence</h2>
          <p className="text-slate-500 text-sm">Research any company and generate production-ready outreach in 90 seconds.</p>
        </div>

        <div className="bg-slate-800/40 border border-slate-700/60 rounded-xl p-5 mb-5 space-y-4">
          <div>
            <label className="block text-[10px] font-semibold text-slate-500 mb-2 uppercase tracking-widest">
              Target Company <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={newAccountForm.companyName}
              onChange={(e) => setNewAccountForm({ ...newAccountForm, companyName: e.target.value })}
              placeholder="e.g., Databricks, Shopify, Stripe"
              className="w-full bg-slate-900 border border-slate-700 text-white px-4 py-3 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent placeholder-slate-600"
              disabled={isGenerating}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-semibold text-slate-500 mb-2 uppercase tracking-widest">Contact Name</label>
              <input
                type="text"
                value={newAccountForm.contactName}
                onChange={(e) => setNewAccountForm({ ...newAccountForm, contactName: e.target.value })}
                placeholder="Jane Smith"
                className="w-full bg-slate-900 border border-slate-700 text-white px-3 py-2.5 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent placeholder-slate-600"
                disabled={isGenerating}
              />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-slate-500 mb-2 uppercase tracking-widest">Contact Role</label>
              <input
                type="text"
                value={newAccountForm.contactRole}
                onChange={(e) => setNewAccountForm({ ...newAccountForm, contactRole: e.target.value })}
                placeholder="VP of Engineering"
                className="w-full bg-slate-900 border border-slate-700 text-white px-3 py-2.5 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent placeholder-slate-600"
                disabled={isGenerating}
              />
            </div>
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-slate-500 mb-2 uppercase tracking-widest">Industry</label>
            <input
              type="text"
              value={newAccountForm.industry}
              onChange={(e) => setNewAccountForm({ ...newAccountForm, industry: e.target.value })}
              placeholder="SaaS, E-commerce, Healthcare"
              className="w-full bg-slate-900 border border-slate-700 text-white px-3 py-2.5 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent placeholder-slate-600"
              disabled={isGenerating}
            />
          </div>
        </div>

        {/* Generation progress steps — all 8 run in parallel */}
        <div className="grid grid-cols-2 gap-2 mb-5">
          {Object.entries(SECTION_LABELS).map(([sectionType, label]) => {
            const isDone = completedSections.has(sectionType);
            const isActive = isGenerating && !isDone;
            return (
              <div
                key={sectionType}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs border transition-colors ${
                  isDone
                    ? 'bg-slate-800/20 border-slate-700/20 text-slate-500'
                    : isActive
                    ? 'bg-teal-500/10 border-teal-500/30 text-teal-300'
                    : 'bg-transparent border-slate-800 text-slate-600'
                }`}
              >
                {isDone ? (
                  <CheckCircle className="w-3 h-3 text-teal-500 shrink-0" />
                ) : isActive ? (
                  <Loader2 className="w-3 h-3 animate-spin shrink-0" />
                ) : (
                  <div className="w-3 h-3 rounded-full border border-slate-700 shrink-0" />
                )}
                {label}
              </div>
            );
          })}
        </div>

        {generationError && (
          <div className="mb-4 flex items-start gap-3 bg-red-900/20 border border-red-700/40 rounded-lg p-4">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-red-300 text-sm font-medium mb-0.5">Generation failed</p>
              <p className="text-red-400/70 text-xs">{generationError}</p>
            </div>
          </div>
        )}

        <button
          onClick={handleGenerate}
          disabled={isGenerating || !newAccountForm.companyName}
          className="w-full bg-teal-500 hover:bg-teal-400 disabled:bg-slate-800 disabled:text-slate-600 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-lg transition-all flex items-center justify-center gap-2 text-sm"
        >
          {isGenerating ? (
            <><Loader2 className="w-4 h-4 animate-spin" />Generating ({completedSections.size}/8 complete)...</>
          ) : (
            <><Zap className="w-4 h-4" />Generate Account Research</>
          )}
        </button>

        {accounts.length > 0 && (
          <div className="mt-8 pt-6 border-t border-slate-800">
            <p className="text-[10px] font-semibold text-slate-600 uppercase tracking-widest mb-3">Recent Accounts</p>
            <div className="space-y-2">
              {accounts.slice(0, 5).map((account) => (
                <div key={account.id} className="flex items-center justify-between bg-slate-800/30 border border-slate-700/40 rounded-lg px-4 py-3">
                  <button onClick={() => { setSelectedAccount(account); setCurrentView('app'); }} className="flex-1 text-left">
                    <div className="text-white text-sm font-medium">{account.company_name}</div>
                    <div className="text-slate-600 text-xs mt-0.5">
                      {new Date(account.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </div>
                  </button>
                  <button onClick={() => handleDeleteAccount(account.id)} className="text-slate-700 hover:text-red-400 transition-colors p-1 ml-2">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );

  const renderApp = () => {
    if (accounts.length === 0) {
      return (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center max-w-xs">
            <div className="w-14 h-14 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center mx-auto mb-4">
              <Building2 className="w-6 h-6 text-slate-600" />
            </div>
            <h2 className="text-white font-semibold text-base mb-2">No accounts yet</h2>
            <p className="text-slate-500 text-sm mb-5">Generate your first account intelligence to get started.</p>
            <button
              onClick={() => setCurrentView('generate')}
              className="bg-teal-500 hover:bg-teal-400 text-white font-medium py-2 px-5 rounded-lg transition-colors text-sm inline-flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />Create First Account
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <div className="w-60 border-r border-slate-700/40 bg-slate-900 flex flex-col shrink-0">
          <div className="p-3 border-b border-slate-700/40">
            <button
              onClick={() => setCurrentView('generate')}
              className="w-full flex items-center justify-center gap-1.5 bg-teal-500 hover:bg-teal-400 text-white text-xs font-semibold py-2 px-3 rounded-lg transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />New Account
            </button>
          </div>
          <div className="px-3 pt-3 pb-1">
            <p className="text-[10px] font-semibold text-slate-600 uppercase tracking-widest px-2">
              Accounts ({accounts.length})
            </p>
          </div>
          <div className="flex-1 overflow-y-auto px-2 pb-2">
            {accounts.map((account) => {
              const active = selectedAccount?.id === account.id;
              return (
                <button
                  key={account.id}
                  onClick={() => { setSelectedAccount(account); setActiveTab('objectives'); }}
                  className={`w-full text-left px-3 py-2.5 rounded-lg mb-0.5 transition-colors border ${
                    active ? 'bg-teal-500/10 border-teal-500/20' : 'border-transparent hover:bg-slate-800'
                  }`}
                >
                  <div className={`text-xs font-semibold truncate ${active ? 'text-teal-300' : 'text-slate-300'}`}>
                    {account.company_name}
                  </div>
                  {account.contact_name && account.contact_name !== 'Decision Maker' && (
                    <div className="text-slate-600 text-[10px] truncate mt-0.5">{account.contact_name}</div>
                  )}
                  <div className="text-slate-700 text-[10px] mt-0.5">
                    {new Date(account.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Content area */}
        {selectedAccount ? (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Account header */}
            <div className="px-6 py-4 border-b border-slate-700/40 bg-slate-900 flex items-center justify-between shrink-0">
              <div>
                <h2 className="text-white font-bold text-base">{selectedAccount.company_name}</h2>
                {selectedAccount.contact_name && selectedAccount.contact_name !== 'Decision Maker' && (
                  <p className="text-slate-500 text-xs mt-0.5">
                    {selectedAccount.contact_name}
                    {selectedAccount.contact_role && ` · ${selectedAccount.contact_role}`}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <div className="text-[10px] text-slate-600 uppercase tracking-wide">Accuracy</div>
                  <div className="text-teal-400 font-bold text-sm">95%</div>
                </div>
                <button
                  onClick={() => handleDeleteAccount(selectedAccount.id)}
                  className="p-1.5 text-slate-700 hover:text-red-400 hover:bg-slate-800 rounded-lg transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Tab bar */}
            <div className="flex border-b border-slate-700/40 bg-slate-900 overflow-x-auto shrink-0">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const active = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-1.5 py-3 px-4 text-[11px] font-medium whitespace-nowrap transition-colors border-b-2 ${
                      active
                        ? 'border-teal-500 text-teal-400 bg-teal-500/5'
                        : 'border-transparent text-slate-500 hover:text-slate-300 hover:bg-slate-800/50'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto bg-slate-950 p-6">
              <div className="max-w-3xl mx-auto">
                <ContentRenderer text={selectedAccount.content?.[activeTab]} />
                <div className="mt-8 pt-4 border-t border-slate-800/60 flex items-center gap-5 text-[10px] text-slate-700">
                  <span>Analysis: Enterprise-Grade</span>
                  <span>Updated: {new Date(selectedAccount.created_at).toLocaleString()}</span>
                  <span>Model: Claude Sonnet 4</span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center bg-slate-950">
            <div className="text-center">
              <Search className="w-9 h-9 text-slate-800 mx-auto mb-3" />
              <p className="text-slate-600 text-sm">Select an account to view intelligence</p>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderInfo = () => (
    <div className="flex-1 overflow-y-auto bg-slate-950 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-3xl font-bold text-white mb-2">Enterprise Architecture</h1>
          <p className="text-slate-500 text-sm">Cloud-native platform engineered for scale and security</p>
        </div>

        <div className="grid md:grid-cols-3 gap-4 mb-10">
          {[
            { icon: Globe, title: 'Data Acquisition', items: ['Web scraping & parsing', 'API integrations', 'SEC/EDGAR parsing', 'News aggregation', 'Investment doc analysis'] },
            { icon: BarChart3, title: 'Intelligence Processing', items: ['Vector embeddings', 'LLM prompt engineering', 'Sentiment analysis', 'Entity extraction (NER)', 'Competitive benchmarking'] },
            { icon: Zap, title: 'Content Generation', items: ['Multi-channel sequences', 'Personalization engine', 'A/B testing framework', 'Deliverability optimization', 'CAN-SPAM compliance'] },
          ].map(({ icon: Icon, title, items }) => (
            <div key={title} className="bg-slate-900 border border-slate-700/60 rounded-xl p-5">
              <div className="w-8 h-8 rounded-lg bg-teal-500/10 flex items-center justify-center mb-3">
                <Icon className="w-4 h-4 text-teal-400" />
              </div>
              <h3 className="text-white font-semibold text-sm mb-3">{title}</h3>
              <ul className="space-y-1.5">
                {items.map((item) => (
                  <li key={item} className="flex items-center gap-2 text-slate-500 text-xs">
                    <span className="w-1 h-1 rounded-full bg-slate-600 shrink-0" />{item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="grid md:grid-cols-2 gap-4 mb-10">
          {[
            {
              title: 'Technology Stack',
              rows: [
                { label: 'Frontend', value: 'React 19, TypeScript, Tailwind CSS' },
                { label: 'Backend', value: 'Python (FastAPI), Node.js, REST APIs' },
                { label: 'AI/ML', value: 'Claude API, Vector databases, LangChain' },
                { label: 'Infrastructure', value: 'AWS, Docker, Kubernetes, CI/CD' },
              ],
            },
            {
              title: 'Compliance & Security',
              rows: [
                { label: 'Data Protection', value: 'GDPR compliant, SOC 2 Type II' },
                { label: 'Email Compliance', value: 'CAN-SPAM Act adherence' },
                { label: 'Multi-Tenancy', value: 'Isolated schemas, RBAC' },
                { label: 'Monitoring', value: '99.9% SLA, error tracking' },
              ],
            },
          ].map(({ title, rows }) => (
            <div key={title} className="bg-slate-900 border border-slate-700/60 rounded-xl p-5">
              <h3 className="text-white font-semibold text-sm mb-4">{title}</h3>
              <div className="space-y-3">
                {rows.map(({ label, value }) => (
                  <div key={label} className="flex justify-between gap-4">
                    <span className="text-teal-400 text-xs font-medium shrink-0">{label}</span>
                    <span className="text-slate-500 text-xs text-right">{value}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mb-10">
          <h2 className="text-xl font-bold text-white text-center mb-6">Subscription Plans</h2>
          <div className="grid md:grid-cols-3 gap-4">
            {[
              { name: 'Starter', price: '$0', sub: '10 accounts/month', features: ['Basic company research', 'Email sequences', 'Call scripts', 'Standard support'], featured: false },
              { name: 'Professional', price: '$10/mo', sub: '50 accounts/month', features: ['Everything in Starter', 'Competitive analysis', 'Industry insights', 'Vector matching', 'Priority support'], featured: true },
              { name: 'Enterprise', price: 'Custom', sub: 'Unlimited accounts', features: ['Everything in Pro', 'Custom integrations', 'Dedicated support', 'SLA guarantees', 'White-label'], featured: false },
            ].map(({ name, price, sub, features, featured }) => (
              <div key={name} className={`rounded-xl p-5 border ${featured ? 'bg-teal-500 border-teal-400' : 'bg-slate-900 border-slate-700/60'}`}>
                {featured && <div className="text-[9px] font-bold tracking-widest uppercase text-teal-100 mb-2">Most Popular</div>}
                <h3 className="text-white font-bold text-base mb-0.5">{name}</h3>
                <div className="text-2xl font-bold text-white mb-0.5">{price}</div>
                <p className={`text-xs mb-4 ${featured ? 'text-teal-100' : 'text-slate-600'}`}>{sub}</p>
                <ul className="space-y-1.5">
                  {features.map((f) => (
                    <li key={f} className={`flex items-center gap-2 text-xs ${featured ? 'text-teal-100' : 'text-slate-400'}`}>
                      <CheckCircle className="w-3 h-3 shrink-0" />{f}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="text-center">
          <button
            onClick={() => setCurrentView(user ? 'generate' : 'auth')}
            className="bg-teal-500 hover:bg-teal-400 text-white font-semibold py-2.5 px-8 rounded-lg transition-colors text-sm inline-flex items-center gap-2"
          >
            Get Started <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );

  // ─── Shell ────────────────────────────────────────────────────────────────────
  return (
    <div className="h-screen bg-slate-950 flex flex-col overflow-hidden">
      {/* Header */}
      <header className="bg-slate-900 border-b border-slate-700/40 px-5 py-2.5 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-7">
          <button
            onClick={() => setCurrentView(user ? 'generate' : 'landing')}
            className="flex items-center gap-2 text-white font-bold hover:text-teal-400 transition-colors"
          >
            <div className="w-6 h-6 rounded-md bg-teal-500 flex items-center justify-center">
              <Globe className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="text-sm tracking-tight">ProspectNav</span>
          </button>

          {user && (
            <nav className="flex items-center gap-0.5">
              {[
                { view: 'generate', label: 'Research', icon: Plus },
                { view: 'app', label: accounts.length > 0 ? `Accounts (${accounts.length})` : 'Accounts', icon: FileText },
                { view: 'info', label: 'Platform', icon: Building2 },
              ].map(({ view, label, icon: Icon }) => (
                <button
                  key={view}
                  onClick={() => setCurrentView(view)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                    currentView === view ? 'bg-slate-800 text-white' : 'text-slate-500 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  <Icon className="w-3 h-3" />{label}
                </button>
              ))}
            </nav>
          )}
        </div>

        <div className="flex items-center gap-2">
          {user ? (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-800/60 rounded-lg">
                <div className="w-4 h-4 rounded-full bg-teal-500 flex items-center justify-center shrink-0">
                  <span className="text-white text-[8px] font-bold">
                    {user.email ? user.email[0].toUpperCase() : 'U'}
                  </span>
                </div>
                <span className="text-slate-400 text-xs">{user.email}</span>
              </div>
              <button
                onClick={signOut}
                title="Sign Out"
                className="p-1.5 text-slate-600 hover:text-slate-300 hover:bg-slate-800 rounded-lg transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => { setCurrentView('auth'); setAuthMode('signin'); }}
              className="text-xs text-teal-400 hover:text-teal-300 font-medium transition-colors"
            >
              Sign In
            </button>
          )}
        </div>
      </header>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {currentView === 'landing' && renderLanding()}
        {currentView === 'auth' && renderAuth()}
        {currentView === 'generate' && renderGenerate()}
        {currentView === 'app' && renderApp()}
        {currentView === 'info' && renderInfo()}
      </div>
    </div>
  );
}
