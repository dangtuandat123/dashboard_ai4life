import React, { useEffect, useRef, useState } from 'react';
import { ArrowUp, Bot, Moon, Sparkles, Sun, X } from 'lucide-react';
import { useDashboardData } from './data/mockData.jsx';
import PYPPerformance from './components/PYPPerformance';
import SalesPipeline from './components/SalesPipeline';
import TopPerformersHeatmap from './components/TopPerformersHeatmap';
import ChienBinhSales from './components/ChienBinhSales';
import HieuSuatTaiChinh from './components/HieuSuatTaiChinh';
import KenhBanHang from './components/KenhBanHang';
import DoanhThuSanPham from './components/DoanhThuSanPham';
import SoLuongBan from './components/SoLuongBan';
import LoiNhuanRong from './components/LoiNhuanRong';

function App() {
    const [theme, setTheme] = useState(() => {
        if (typeof window === 'undefined') return 'dark';
        const stored = localStorage.getItem('bb-theme');
        if (stored === 'light' || stored === 'dark') return stored;
        const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
        const resolvedTheme = prefersDark ? 'dark' : 'light';
        document.documentElement.setAttribute('data-theme', resolvedTheme);
        return resolvedTheme;
    });
    const [activeSection, setActiveSection] = useState('perf');
    const [showScrollTop, setShowScrollTop] = useState(false);
    const [assistantOpen, setAssistantOpen] = useState(false);
    const [chartRerender, setChartRerender] = useState(0);
    const [showGreeting, setShowGreeting] = useState(false);
    const [chatInput, setChatInput] = useState('');
    const [chatMessages, setChatMessages] = useState([]);
    const chatEndRef = useRef(null);
    const isDark = theme === 'dark';
    const toggleTheme = () => setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));

    // Format currency: >= 1 tỷ -> tỷ, else triệu
    const formatCurrency = (value) => {
        if (value >= 1000000000) {
            return { value: (value / 1000000000).toFixed(2), unit: 'tỷ' };
        }
        return { value: Math.round(value / 1000000), unit: 'triệu' };
    };

    // Get real-time data from Supabase (auto-refreshes every 15s)
    const { pypPerformance, pipelineStages } = useDashboardData();

    // Use real data or fallback to default values
    const pypData = pypPerformance.data || [];
    const pipelineData = pipelineStages.data || [];

    const currentMonth = pypData[pypData.length - 1] || { actual: 0, target: 0, month: 'T12' };
    const kpiCompletion = currentMonth.target > 0
        ? Math.round((currentMonth.actual / currentMonth.target) * 100)
        : 0;
    const totalPipeline = pipelineData.reduce((sum, stage) => sum + (stage.count || 0), 0);
    const hottestStage = pipelineData.length > 0
        ? pipelineData.reduce((max, stage) => ((stage.count || 0) > (max.count || 0) ? stage : max), pipelineData[0])
        : { label: 'N/A', count: 0, color: '#gray' };

    const perfRef = useRef(null);
    const productRef = useRef(null);
    const financeRef = useRef(null);

    const prefersReducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('bb-theme', theme);
    }, [theme]);

    useEffect(() => {
        setShowGreeting(true);
        const timer = setTimeout(() => setShowGreeting(false), 60000);
        return () => clearTimeout(timer);
    }, []);

    // Force charts to recalc width when assistant panel toggles
    useEffect(() => {
        // Nudge responsive charts (Treemap) to recalc when layout shrinks
        const tick = () => window.dispatchEvent(new Event('resize'));
        const timer = setTimeout(() => {
            setChartRerender((k) => k + 1);
            tick();
            setTimeout(tick, 120);
        }, 30);
        return () => clearTimeout(timer);
    }, [assistantOpen]);

    useEffect(() => {
        if (assistantOpen && chatEndRef.current) {
            chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [assistantOpen, chatMessages]);

    useEffect(() => {
        if (chatMessages.length === 0) {
            setChatMessages([
                { id: 1, from: 'bot', text: 'Xin chào, tôi là Gemini BeeBox! Tôi có thể giúp tóm tắt KPI và gợi ý ưu tiên.' },
                { id: 2, from: 'user', text: 'Hãy cho tôi biết tình hình KPI tháng này.' },
                { id: 3, from: 'bot', text: `Bạn đã đạt ${kpiCompletion}% KPI tháng ${currentMonth.month}. Nên đẩy mạnh giai đoạn ${hottestStage.label} (${hottestStage.count} hồ sơ).` }
            ]);
        }
    }, [chatMessages.length, kpiCompletion, currentMonth.month, hottestStage.label, hottestStage.count]);

    const handleSendMessage = () => {
        const text = chatInput.trim();
        if (!text) return;
        const userMsg = { id: Date.now(), from: 'user', text };
        const botMsg = {
            id: Date.now() + 1,
            from: 'bot',
            text: 'Tôi đã ghi nhận: "' + text + '". Bạn muốn tôi tóm tắt KPI hay pipeline không?'
        };
        setChatMessages((prev) => [...prev, userMsg, botMsg]);
        setChatInput('');
    };

    const scrollToSection = (ref, alignBottom = false, forceCenter = false) => {
        if (!ref?.current) return;
        const rect = ref.current.getBoundingClientRect();
        const offset = window.innerWidth < 768 ? 80 : 120;
        const centerOffset = Math.max((window.innerHeight - rect.height) / 2, 0);
        const top = alignBottom
            ? rect.bottom + window.scrollY - window.innerHeight + offset
            : forceCenter
                ? rect.top + window.scrollY - centerOffset
                : rect.top + window.scrollY - offset - centerOffset;
        window.scrollTo({ top: Math.max(top, 0), behavior: prefersReducedMotion ? 'auto' : 'smooth' });
    };

    // Detect section in viewport to highlight nav
    useEffect(() => {
        const sections = [
            { key: 'perf', ref: perfRef },
            { key: 'product', ref: productRef },
            { key: 'finance', ref: financeRef }
        ];
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        const found = sections.find((s) => s.ref.current === entry.target);
                        if (found) setActiveSection(found.key);
                    }
                });
            },
            { threshold: 0.5, rootMargin: '-10% 0px -10% 0px' }
        );
        sections.forEach((s) => s.ref.current && observer.observe(s.ref.current));
        return () => observer.disconnect();
    }, []);

    useEffect(() => {
        const onScroll = () => setShowScrollTop(window.scrollY > 400);
        window.addEventListener('scroll', onScroll);
        return () => window.removeEventListener('scroll', onScroll);
    }, []);

    return (
        <div className={`dashboard-container ${assistantOpen ? 'assistant-open' : ''}`}>
            {/* Side quick-nav */}
            <div className="fixed right-3 lg:right-6 top-1/2 -translate-y-1/2 flex flex-col gap-2 z-30 quick-nav">
                {[
                    { key: 'perf', label: 'Hiệu suất', ref: perfRef, alignBottom: false, forceCenter: false },
                    { key: 'product', label: 'Sản phẩm', ref: productRef, alignBottom: false, forceCenter: true },
                    { key: 'finance', label: 'Tài chính', ref: financeRef, alignBottom: true, forceCenter: false }
                ].map((item) => (
                    <button
                        key={item.key}
                        onClick={() => scrollToSection(item.ref, item.alignBottom, item.forceCenter)}
                        aria-label={`Đi tới ${item.label}`}
                        className={`nav-chip ${activeSection === item.key ? 'nav-chip--active' : ''}`}
                    >
                        <span className="nav-chip__dot" />
                        {item.label}
                    </button>
                ))}
            </div>
            <div className={`content-wrapper ${assistantOpen ? 'content-with-assistant' : ''} relative max-w-6xl xl:max-w-7xl mx-auto px-4 lg:px-6 py-6 lg:py-8`}>
                <div className="absolute inset-0 pointer-events-none">
                    <div className="aurora-blur" />
                    <div className="grid-overlay" />
                </div>

                {/* Header */}
                <div className="relative flex flex-wrap items-start justify-between gap-4 mb-6">
                    <div className="flex items-center gap-3">
                        <div className="logo-mark">
                            <span className="logo-text">BB</span>
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h1 className="text-2xl font-bold text-white leading-tight">BeeBox Intelligence</h1>
                                <span className="live-pill">
                                    <span className="pill-dot" />
                                    Thời gian thực
                                </span>
                            </div>
                            <p className="text-sm text-slate-400">Dashboard doanh thu & phễu bán hàng thời gian thực</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap justify-end">
                        <div className="frosted-pill">
                            <span className="status-dot" />
                            Tháng {currentMonth.month}, {new Date().getFullYear()}
                        </div>
                        <button
                            onClick={toggleTheme}
                            className="theme-toggle"
                            aria-label="Chuyển chế độ sáng tối"
                        >
                            <span className="icon-pill">
                                {isDark ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
                            </span>
                            <div className="leading-tight text-left">
                                <p className="text-[10px] uppercase tracking-[0.12em] text-slate-400">Giao diện</p>
                                <p className="text-xs font-semibold text-white">{isDark ? 'Chế độ tối' : 'Chế độ sáng'}</p>
                            </div>
                        </button>
                        <button className="primary-action">
                            <Sparkles className="w-4 h-4" />
                            Xuất báo cáo
                        </button>
                    </div>
                </div>
                <div className="relative space-y-8">
                    {/* Section: Hiệu suất & Pipeline */}
                    <div ref={perfRef} className="section-shell space-y-3 min-h-[70vh] md:min-h-[85vh] flex flex-col scroll-mt-[140px] md:scroll-mt-[160px]">
                        <div className="section-head">
                            <div>
                                <p className="section-kicker">Hiệu suất & pipeline</p>
                                <div className="flex items-center gap-2">
                                    <h2 className="section-title">Theo dõi KPI và luồng bán hàng</h2>
                                    <div className="section-underline" />
                                </div>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                            <div className="glass rounded-xl p-3 border border-white/10 backdrop-blur-md">
                                <p className="text-[10px] text-emerald-400 uppercase tracking-[0.12em]">KPI tháng</p>
                                <div className="flex items-baseline gap-1">
                                    <span className="text-2xl font-bold text-white">{formatCurrency(currentMonth.actual).value}</span>
                                    <span className="text-sm text-slate-300 ml-1">{formatCurrency(currentMonth.actual).unit}</span>
                                    <span className="text-xs text-emerald-300 font-semibold">{kpiCompletion}% KPI</span>
                                </div>
                                <p className="text-[11px] text-slate-400">Mục tiêu: {formatCurrency(currentMonth.target).value} {formatCurrency(currentMonth.target).unit}</p>
                            </div>

                            <div className="glass rounded-xl p-3 border border-white/10 backdrop-blur-md">
                                <p className="text-[10px] text-cyan-300 uppercase tracking-[0.12em]">Pipeline</p>
                                <div className="flex items-baseline gap-2">
                                    <span className="text-2xl font-bold text-white">{totalPipeline}</span>
                                    <span className="text-xs text-slate-300">lead/khách hàng</span>
                                </div>
                                <p className="text-[11px] text-slate-400">Giai đoạn nóng: {hottestStage.label}</p>
                            </div>

                            <div className="glass rounded-xl p-3 border border-white/10 backdrop-blur-md">
                                <p className="text-[10px] text-purple-300 uppercase tracking-[0.12em]">Giai đoạn đỉnh</p>
                                <div className="flex items-center gap-2">
                                    <span
                                        className="h-2.5 w-2.5 rounded-full"
                                        style={{
                                            backgroundColor: hottestStage.color,
                                            boxShadow: `0 0 10px ${hottestStage.color}80`
                                        }}
                                    />
                                    <span className="text-sm font-semibold text-white">{hottestStage.label}</span>
                                    <span className="text-xs text-slate-400">({hottestStage.count} hồ sơ)</span>
                                </div>
                                <p className="text-[11px] text-slate-400">Ưu tiên xử lý trước</p>
                            </div>

                            <div className="glass rounded-xl p-3 border border-white/10 backdrop-blur-md">
                                <p className="text-[10px] text-emerald-300 uppercase tracking-[0.12em]">Trạng thái</p>
                                <div className="flex items-center gap-2">
                                    <span className="h-2 w-2 rounded-full bg-emerald-400" />
                                    <span className="text-sm font-semibold text-white">Sẵn sàng hành động</span>
                                </div>
                                <p className="text-[11px] text-slate-400">Nguồn lực đầy đủ</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-12 auto-rows-[minmax(220px,auto)] gap-3 flex-1">
                            <div className="col-span-12 lg:col-span-4 min-w-0">
                                <PYPPerformance />
                            </div>
                            <div className="col-span-12 lg:col-span-8 min-w-0">
                                <SalesPipeline />
                            </div>
                        </div>
                    </div>

                    {/* Section: Sản phẩm & sản lượng */}
                    <div ref={productRef} className="section-shell space-y-3 min-h-[70vh] md:min-h-[85vh] flex flex-col scroll-mt-[140px] md:scroll-mt-[160px]">
                        <div className="section-head">
                            <div>
                                <p className="section-kicker">Sản phẩm & sản lượng</p>
                                <div className="flex items-center gap-2">
                                    <h2 className="section-title">Doanh thu theo dòng và số lượng bán</h2>
                                    <div className="section-underline" />
                                </div>
                            </div>
                        </div>
                        <div className="grid grid-cols-12 auto-rows-[minmax(260px,auto)] gap-3 flex-1">
                            <div className="col-span-12 xl:col-span-8 min-w-0">
                                <DoanhThuSanPham />
                            </div>
                            <div className="col-span-12 xl:col-span-4 min-w-0 grid grid-rows-2 gap-3 auto-rows-[minmax(180px,auto)]">
                                <div className="min-h-[200px]">
                                    <SoLuongBan key={`so-luong-${chartRerender}`} />
                                </div>
                                <div className="min-h-[180px]">
                                    <KenhBanHang />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Section: Nhân sự & tài chính */}
                    <div ref={financeRef} className="section-shell space-y-3 min-h-[70vh] md:min-h-[85vh] flex flex-col scroll-mt-[140px] md:scroll-mt-[160px]">
                        <div className="section-head">
                            <div>
                                <p className="section-kicker">Nhân sự & tài chính</p>
                                <div className="flex items-center gap-2">
                                    <h2 className="section-title">Chiến binh dẫn đầu, hiệu suất và tài chính</h2>
                                    <div className="section-underline" />
                                </div>
                            </div>
                        </div>
                        <div className="grid grid-cols-12 auto-rows-[minmax(240px,auto)] gap-3 flex-1">
                            <div className="col-span-12 md:col-span-6 xl:col-span-6 min-w-0">
                                <ChienBinhSales />
                            </div>
                            <div className="col-span-12 md:col-span-6 xl:col-span-6 min-w-0">
                                <TopPerformersHeatmap />
                            </div>
                            <div className="col-span-12 lg:col-span-6 min-w-0">
                                <HieuSuatTaiChinh />
                            </div>
                            <div className="col-span-12 lg:col-span-6 min-w-0">
                                <LoiNhuanRong />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {showScrollTop && (
                <button
                    onClick={() => window.scrollTo({ top: 0, behavior: prefersReducedMotion ? 'auto' : 'smooth' })}
                    className="scroll-top"
                    aria-label="Lên đầu trang"
                >
                    <ArrowUp className="w-4 h-4" />
                </button>
            )}

            {!assistantOpen && (
                <button
                    className="assistant-toggle"
                    onClick={() => setAssistantOpen(true)}
                    aria-label="Mở trợ lý AI"
                    aria-pressed={assistantOpen}
                >
                    <span className="assistant-toggle__glow" />
                    <span className="assistant-bee" role="img" aria-hidden="true">🐝</span>
                    {showGreeting && <span className="assistant-bubble">Chào bạn, tôi là trợ lý AI phân tích dữ liệu BeeBox 👋</span>}
                </button>
            )}

            <aside className={`assistant-panel ${assistantOpen ? 'assistant-panel--open' : ''}`} aria-hidden={!assistantOpen}>
                <div className="assistant-panel__header">
                    <div>
                        <p className="assistant-kicker">Trợ lý AI</p>
                        <h3 className="assistant-title">Gemini for BeeBox</h3>
                    </div>
                    <button className="assistant-close" onClick={() => setAssistantOpen(false)} aria-label="Đóng trợ lý">
                        <X className="w-4 h-4" />
                    </button>
                </div>
                <div className="assistant-panel__body">
                    <div className="assistant-chat">
                        <div className="assistant-messages">
                            {chatMessages.map((msg) => (
                                <div key={msg.id} className={`chat-row ${msg.from === 'bot' ? 'chat-row--bot' : 'chat-row--user'}`}>
                                    <div className="chat-avatar">
                                        {msg.from === 'bot' ? '🤖' : '🙋'}
                                    </div>
                                    <div className={`chat-bubble ${msg.from === 'bot' ? 'chat-bubble--bot' : 'chat-bubble--user'}`}>
                                        {msg.text}
                                    </div>
                                </div>
                            ))}
                            <div ref={chatEndRef} />
                        </div>
                        <div className="assistant-suggestions">
                            {['Tóm tắt KPI', 'Rủi ro pipeline', 'Đề xuất ưu tiên', 'Xuất báo cáo'].map((chip) => (
                                <button
                                    key={chip}
                                    className="assistant-chip"
                                    onClick={() => setChatInput(chip)}
                                >
                                    {chip}
                                </button>
                            ))}
                        </div>
                        <div className="assistant-input">
                            <input
                                type="text"
                                placeholder="Hỏi Gemini về KPI, pipeline, nhân sự..."
                                value={chatInput}
                                onChange={(e) => setChatInput(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                            />
                            <button className="assistant-send" onClick={handleSendMessage} aria-label="Gửi">
                                ➤
                            </button>
                        </div>
                    </div>
                </div>
            </aside>
        </div>
    );
}

export default App;
