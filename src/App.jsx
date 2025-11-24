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
    const [chatMessages, setChatMessages] = useState([
        {
            id: 1,
            from: 'bot',
            type: 'text',
            text: 'Chào bạn! Tôi là BeeBox AI, sẵn sàng hỗ trợ phân tích KPI, pipeline và báo cáo.'
        }
    ]);
    const [isSending, setIsSending] = useState(false);
    const [sendTimer, setSendTimer] = useState(0);
    const [chartHeights, setChartHeights] = useState({});
    const [autoSuggestions, setAutoSuggestions] = useState([]);
    const [suggestLoading, setSuggestLoading] = useState(false);
    const [chartFullscreen, setChartFullscreen] = useState({ open: false, html: '' });
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
    const {
        pypPerformance,
        pipelineStages,
        financialData,
        productLines,
        salesQuantity,
        salesChannels,
        topPerformersHeatmap
    } = useDashboardData();

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

    const latestFinance = financialData?.data?.[financialData.data.length - 1] || {};
    const latestRevenue = Number(latestFinance?.revenue) || 0;
    const latestCost = Number(latestFinance?.cost) || 0;

    const topLine = (productLines?.data || []).reduce((max, item) => (Number(item?.revenue || 0) > Number(max?.revenue || 0) ? item : max), null);
    const topChannel = (salesChannels?.data || []).reduce((max, item) => (Number(item?.value || item?.revenue || 0) > Number(max?.value || max?.revenue || 0) ? item : max), null);
    const topQuantity = (salesQuantity?.data || []).reduce((max, item) => (Number(item?.value || item?.quantity || item?.count || 0) > Number(max?.value || max?.quantity || max?.count || 0) ? item : max), null);
    const topPerformer = (topPerformersHeatmap?.data || [])[0] || null;

    const currencyText = (value) => {
        const { value: v, unit } = formatCurrency(value);
        return `${v} ${unit}`;
    };

    const triggerAssistantPrompt = (title, valueText) => {
        const prompt = `Mình đang xem dashboard BeeBox, mục "${title}": ${valueText}. Hãy phân tích về vấn đề này.`;
        setAssistantOpen(true);
        setChatInput(prompt);
        // đợi panel mở rồi gửi
        setTimeout(() => {
            sendMessage(prompt, { meta: { fromDashboard: true } });
            chatEndRef.current?.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth' });
        }, 120);
    };

    useEffect(() => {
        const handler = (e) => {
            const { title, text } = e.detail || {};
            if (!title || !text) return;
            triggerAssistantPrompt(title, text);
        };
        window.addEventListener('bb-insight', handler);
        return () => window.removeEventListener('bb-insight', handler);
    }, []);

    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('bb-theme', theme);
    }, [theme]);

    useEffect(() => {
        setShowGreeting(true);
        const timer = setTimeout(() => setShowGreeting(false), 60000);
        return () => clearTimeout(timer);
    }, []);

    useEffect(() => {
        const trimmed = chatInput.trim();
        if (!trimmed) {
            setAutoSuggestions([]);
            setSuggestLoading(false);
            return;
        }
        const controller = new AbortController();
        setSuggestLoading(true);
        const timer = setTimeout(async () => {
            try {
                const resp = await fetch('https://chatgpt.id.vn/webhook/agent-suggest', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ text: trimmed }),
                    signal: controller.signal
                });
                const data = await resp.json();
                const suggestions = data?.output?.suggestions || [];
                setAutoSuggestions(suggestions.slice(0, 6));
            } catch {
                setAutoSuggestions([]);
            } finally {
                setSuggestLoading(false);
            }
        }, 2000);
        return () => {
            clearTimeout(timer);
            controller.abort();
        };
    }, [chatInput]);

    useEffect(() => {
        if (isSending) {
            setSendTimer(0);
            const tick = setInterval(() => setSendTimer((s) => s + 1), 1000);
            return () => clearInterval(tick);
        }
        setSendTimer(0);
    }, [isSending]);

    const renderMarkdown = (text) => {
        if (!text) return '';
        let html = text
            .replace(/```([\s\S]*?)```/g, '<pre class="md-code">$1</pre>')
            .replace(/^### (.*$)/gim, '<h3>$1</h3>')
            .replace(/^## (.*$)/gim, '<h2>$1</h2>')
            .replace(/^# (.*$)/gim, '<h1>$1</h1>')
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>');
        html = html.replace(/^(?:- |\* )(.*(?:\n(?:- |\* ).*)*)/gim, (match) => {
            const items = match
                .split(/\n/)
                .map((line) => line.replace(/^(?:- |\* )/, '').trim())
                .filter(Boolean)
                .map((item) => `<li>${item}</li>`)
                .join('');
            return `<ul>${items}</ul>`;
        });
        html = html.replace(/\n\n/g, '<br/><br/>');
        return html;
    };

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

    const stripChartStyle = (html = '') => html.replace(/<style[\s\S]*?<\/style>/gi, '');
    const injectChartStyle = (html = '') => {
        const style = `<style>
    body, html { height: 100%; margin: 0; }
    .chart-container { position: relative; width: 100%; height: 100vh; }
    canvas { width: 100% !important; height: 100% !important; }
    </style>`;
        const cleaned = stripChartStyle(html || '');
        const hasHead = /<\/head>/i.test(cleaned);
        const hasBody = /<\/body>/i.test(cleaned);
        if (hasHead) {
            return cleaned.replace(/<\/head>/i, `${style}</head>`);
        }
        if (hasBody) {
            return cleaned.replace(/<body[^>]*>/i, (m) => `${m}${style}`);
        }
        return `<html><head>${style}</head><body>${cleaned}</body></html>`;
    };

    const parseWebhookPayload = (raw) => {
        let payload = raw;
        try {
            payload = JSON.parse(raw);
        } catch {
            try {
                payload = JSON.parse(raw.trim().replace(/^"|"$/g, ''));
            } catch {
                payload = [];
            }
        }
        if (!Array.isArray(payload)) return [];
        return payload
            .map((entry, idx) => {
                const data = entry?.json || {};
                if (!data.type) return null;
                if (data.type === 'text') {
                    return { id: Date.now() + idx, from: 'bot', type: 'text', text: data.data || '' };
                }
                if (data.type === 'chart') {
                    const cleaned = stripChartStyle(data.data || '');
                    return { id: Date.now() + idx, from: 'bot', type: 'chart', html: injectChartStyle(cleaned) };
                }
                if (data.type === 'table') {
                    return { id: Date.now() + idx, from: 'bot', type: 'table', columns: data.data?.columns || [], rows: data.data?.rows || [] };
                }
                return null;
            })
            .filter(Boolean);
    };

    const sendMessage = async (overrideText, options = {}) => {
        const meta = options.meta || {};
        const text = (overrideText ?? chatInput).trim();
        if (!text || isSending) return;
        const userMsg = { id: Date.now(), from: 'user', type: 'text', text, ...meta };
        setChatMessages((prev) => [...prev, userMsg]);
        setChatInput('');
        setIsSending(true);
        try {
            const resp = await fetch('https://chatgpt.id.vn/webhook/bb17371c-6a34-421e-b659-75aa42041122', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: text })
            });
            const raw = await resp.text();
            const mapped = parseWebhookPayload(raw);
            setChatMessages((prev) => [...prev, ...mapped]);
        } catch (err) {
            setChatMessages((prev) => [...prev, { id: Date.now(), from: 'bot', type: 'text', text: 'Xin lỗi, BeeBox AI gặp lỗi khi xử lý yêu cầu.' }]);
        } finally {
            setIsSending(false);
        }
    };

    const handleChartLoad = (msgId, event) => {
        const iframe = event.currentTarget;
        let stable = 0;
        let iterations = 0;
        const poll = (prev = 0) => {
            iterations += 1;
            try {
                const doc = iframe.contentWindow?.document;
                if (!doc) return;
                const container = doc.querySelector('.chart-container') || doc.body || doc.documentElement;
                const rect = container?.getBoundingClientRect();
                const containerHeight = rect?.height || container?.scrollHeight || 0;
                const contentHeight = Math.max(containerHeight, 200);
                const padded = contentHeight + 12;
                setChartHeights((prevHeights) => {
                    if (prevHeights[msgId] === padded) return prevHeights;
                    return { ...prevHeights, [msgId]: padded };
                });
                stable = Math.abs(contentHeight - prev) < 1 ? stable + 1 : 0;
                if (stable >= 2 || iterations >= 10) return;
                requestAnimationFrame(() => poll(contentHeight));
            } catch {
                // ignore cross-origin issues
            }
        };
        poll();
    };

    const openChartFullscreen = (html) => {
        setChartFullscreen({ open: true, html });
        document.body.style.overflow = 'hidden';
    };

    const closeChartFullscreen = () => {
        setChartFullscreen({ open: false, html: '' });
        document.body.style.overflow = '';
    };

    const downloadTableCsv = (columns = [], rows = []) => {
        const header = columns.join(',');
        const body = rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
        const csv = [header, body].filter(Boolean).join('\n');
        const blob = new Blob([`\ufeff${csv}`], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `beebox-table-${Date.now()}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    const stopScrollBubble = (e) => e.stopPropagation();

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
                            <div
                                className="glass rounded-xl p-3 border border-white/10 backdrop-blur-md metric-click"
                                onClick={() =>
                                    triggerAssistantPrompt(
                                        'KPI tháng',
                                        `Tháng ${currentMonth.month}: thực đạt ${currencyText(currentMonth.actual)}, mục tiêu ${currencyText(currentMonth.target)}, hoàn thành ${kpiCompletion}%`
                                    )
                                }
                            >
                                <p className="text-[10px] text-emerald-400 uppercase tracking-[0.12em]">KPI tháng</p>
                                <div className="flex items-baseline gap-1">
                                    <span className="text-2xl font-bold text-white">{formatCurrency(currentMonth.actual).value}</span>
                                    <span className="text-sm text-slate-300 ml-1">{formatCurrency(currentMonth.actual).unit}</span>
                                    <span className="text-xs text-emerald-300 font-semibold">{kpiCompletion}% KPI</span>
                                </div>
                                <p className="text-[11px] text-slate-400">Mục tiêu: {formatCurrency(currentMonth.target).value} {formatCurrency(currentMonth.target).unit}</p>
                            </div>

                            <div
                                className="glass rounded-xl p-3 border border-white/10 backdrop-blur-md metric-click"
                                onClick={() =>
                                    triggerAssistantPrompt(
                                        'Pipeline',
                                        `Tổng ${totalPipeline} lead/khách hàng, giai đoạn nóng ${hottestStage.label} (${hottestStage.count} hồ sơ)`
                                    )
                                }
                            >
                                <p className="text-[10px] text-cyan-300 uppercase tracking-[0.12em]">Pipeline</p>
                                <div className="flex items-baseline gap-2">
                                    <span className="text-2xl font-bold text-white">{totalPipeline}</span>
                                    <span className="text-xs text-slate-300">lead/khách hàng</span>
                                </div>
                                <p className="text-[11px] text-slate-400">Giai đoạn nóng: {hottestStage.label}</p>
                            </div>

                            <div
                                className="glass rounded-xl p-3 border border-white/10 backdrop-blur-md metric-click"
                                onClick={() =>
                                    triggerAssistantPrompt(
                                        'Giai đoạn đỉnh',
                                        `${hottestStage.label}: ${hottestStage.count} hồ sơ đang chờ xử lý`
                                    )
                                }
                            >
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

                            <div
                                className="glass rounded-xl p-3 border border-white/10 backdrop-blur-md metric-click"
                                onClick={() =>
                                    triggerAssistantPrompt(
                                        'Trạng thái vận hành',
                                        'Sẵn sàng hành động, nguồn lực đầy đủ'
                                    )
                                }
                            >
                                <p className="text-[10px] text-emerald-300 uppercase tracking-[0.12em]">Trạng thái</p>
                                <div className="flex items-center gap-2">
                                    <span className="h-2 w-2 rounded-full bg-emerald-400" />
                                    <span className="text-sm font-semibold text-white">Sẵn sàng hành động</span>
                                </div>
                                <p className="text-[11px] text-slate-400">Nguồn lực đầy đủ</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-12 auto-rows-[minmax(220px,auto)] gap-3 flex-1">
                            <div className="col-span-12 lg:col-span-4 min-w-0 chart-click">
                                <PYPPerformance />
                            </div>
                            <div className="col-span-12 lg:col-span-8 min-w-0 chart-click">
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
                            <div className="col-span-12 xl:col-span-8 min-w-0 chart-click">
                                <DoanhThuSanPham />
                            </div>
                            <div className="col-span-12 xl:col-span-4 min-w-0 grid grid-rows-2 gap-3 auto-rows-[minmax(180px,auto)]">
                                <div className="min-h-[200px] chart-click">
                                    <SoLuongBan key={`so-luong-${chartRerender}`} />
                                </div>
                                <div className="min-h-[180px] chart-click">
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
                            <div className="col-span-12 md:col-span-6 xl:col-span-6 min-w-0 chart-click">
                                <ChienBinhSales />
                            </div>
                            <div className="col-span-12 md:col-span-6 xl:col-span-6 min-w-0 chart-click">
                                <TopPerformersHeatmap />
                            </div>
                            <div
                                className="col-span-12 lg:col-span-6 min-w-0 chart-click"
                                onClick={() =>
                                    triggerAssistantPrompt(
                                        'Hiệu suất tài chính',
                                        `Tháng mới nhất: revenue ${currencyText(latestRevenue)}, cost ${currencyText(latestCost)}. Hãy phân tích xu hướng revenue/cost và rủi ro.`
                                    )
                                }
                            >
                                <HieuSuatTaiChinh />
                            </div>
                            <div
                                className="col-span-12 lg:col-span-6 min-w-0 chart-click"
                                onClick={() =>
                                    triggerAssistantPrompt(
                                        'Lợi nhuận ròng',
                                        `Tháng mới nhất: revenue ${currencyText(latestRevenue)}, cost ${currencyText(latestCost)}. Hãy phân tích biên lợi nhuận và cách cải thiện.`
                                    )
                                }
                            >
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
                        <h3 className="assistant-title">BeeBox AI Assistant</h3>
                    </div>
                    <button className="assistant-close" onClick={() => setAssistantOpen(false)} aria-label="Đóng trợ lý">
                        <X className="w-4 h-4" />
                    </button>
                </div>
                <div className="assistant-panel__body">
                    <div className="assistant-chat">
                        <div className="assistant-messages" onWheel={stopScrollBubble}>
                            {chatMessages.map((msg) => {
                                const bubbleClass = `chat-bubble ${msg.from === 'bot' ? 'chat-bubble--bot' : 'chat-bubble--user'} ${msg.type !== 'text' ? 'chat-bubble--media' : ''} ${msg.fromDashboard ? 'chat-bubble--dash' : ''}`;
                                return (
                                    <div key={msg.id} className={`chat-row ${msg.from === 'bot' ? 'chat-row--bot' : 'chat-row--user'}`}>
                                        <div className={bubbleClass}>
                                            {msg.type === 'text' && <div className="chat-text" dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.text) }} />}
                                            {msg.type === 'chart' && (
                                                <div className="chat-chart">
                                                    <iframe
                                                        title={`chart-${msg.id}`}
                                                        srcDoc={msg.html}
                                                        sandbox="allow-scripts"
                                                        style={{ height: chartHeights[msg.id] ? `${chartHeights[msg.id]}px` : '280px' }}
                                                        onLoad={(e) => handleChartLoad(msg.id, e)}
                                                    />
                                                    <button className="chart-fullscreen-btn" onClick={() => openChartFullscreen(msg.html)} aria-label="Mở toàn màn hình biểu đồ">
                                                        ⤢
                                                    </button>
                                                </div>
                                            )}
                                            {msg.type === 'table' && (
                                                <div className="chat-table">
                                                    <table>
                                                        <thead>
                                                            <tr>
                                                                {msg.columns.map((col, idx) => (
                                                                    <th key={idx}>{col}</th>
                                                                ))}
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {msg.rows.slice(0, 8).map((row, rIdx) => (
                                                                <tr key={rIdx}>
                                                                    {row.map((cell, cIdx) => (
                                                                        <td key={cIdx}>{cell}</td>
                                                                    ))}
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                    <div className="chat-actions">
                                                        <button
                                                            className="assistant-chip assistant-chip--csv"
                                                            onClick={() => downloadTableCsv(msg.columns, msg.rows)}
                                                        >
                                                            Tải CSV
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                            {isSending && (
                                <div className="chat-row chat-row--bot">
                                    <div className="chat-bubble chat-bubble--bot chat-bubble--thinking">
                                        <div className="ai-thinking ai-thinking--rich">
                                            <span className="spark" />
                                            <span className="spark" />
                                            <span className="spark" />
                                            <span className="bulb" aria-hidden="true">🧠</span>
                                            <span>BeeBox đang suy luận...</span>
                                            <span className="ai-thinking__timer">{sendTimer}s</span>
                                        </div>
                                    </div>
                                </div>
                            )}
                            <div ref={chatEndRef} />
                        </div>
                        <div className={`assistant-suggestions ${suggestLoading || autoSuggestions.length > 0 ? 'is-visible' : ''}`}>
                            {suggestLoading && (
                                <div className="ai-thinking">
                                    <span className="spark" />
                                    <span className="spark" />
                                    <span className="spark" />
                                    <span className="bulb" aria-hidden="true">💡</span>
                                    <span>BeeBox đang gợi ý...</span>
                                </div>
                            )}
                            {!suggestLoading && autoSuggestions.map((suggestion, idx) => (
                                <button
                                    key={idx}
                                    className="assistant-chip assistant-chip--suggest"
                                    onClick={() => setChatInput(suggestion)}
                                >
                                    {suggestion}
                                </button>
                            ))}
                        </div>
                        <div className="assistant-input">
                            <input
                                type="text"
                                placeholder="Hỏi BeeBox về KPI, pipeline, nhân sự..."
                                value={chatInput}
                                onChange={(e) => setChatInput(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                                disabled={isSending}
                                className={suggestLoading ? 'glow-input' : ''}
                            />
                            <button className="assistant-send" onClick={() => sendMessage()} aria-label="Gửi" disabled={isSending}>
                                ➤
                            </button>
                        </div>
                        {isSending && (
                            <div className="ai-thinking ai-thinking--send ai-thinking--rich">
                                <span className="spark" />
                                <span className="spark" />
                                <span className="spark" />
                                <span className="bulb" aria-hidden="true">🧠</span>
                                <span>BeeBox đang suy luận...</span>
                                <span className="ai-thinking__timer">{sendTimer}s</span>
                            </div>
                        )}
                    </div>
                </div>
            </aside>

            {chartFullscreen.open && (
                <div className="chart-fullscreen-overlay" onClick={closeChartFullscreen}>
                    <div className="chart-fullscreen-inner" onClick={(e) => e.stopPropagation()}>
                        <button className="chart-fullscreen-close" onClick={closeChartFullscreen} aria-label="Đóng">
                            <X className="w-4 h-4" />
                        </button>
                        <iframe title="chart-fullscreen" srcDoc={chartFullscreen.html} sandbox="allow-scripts" />
                    </div>
                </div>
            )}
        </div>
    );
}

export default App;
