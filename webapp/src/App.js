import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Link, Navigate, Route, Routes } from "react-router-dom";
export default function App() {
    return (_jsxs(Routes, { children: [_jsx(Route, { path: "/", element: _jsx(ModeChooser, {}) }), _jsx(Route, { path: "*", element: _jsx(Navigate, { to: "/", replace: true }) })] }));
}
function ModeChooser() {
    return (_jsxs("main", { className: "min-h-screen flex flex-col items-center justify-center gap-6 p-6", children: [_jsx("h1", { className: "text-3xl font-semibold", children: "Hiptron" }), _jsx("p", { className: "text-warm-800/80", children: "Choose a mode (prototype):" }), _jsxs("div", { className: "flex flex-col gap-3 w-full max-w-xs", children: [_jsx(Link, { className: "rounded-2xl bg-moss-600 text-white px-6 py-4 text-center text-lg", to: "/older-adult", children: "Older-Adult mode" }), _jsx(Link, { className: "rounded-2xl border-2 border-moss-600 text-moss-600 px-6 py-4 text-center text-lg", to: "/relative", children: "Relative mode" })] })] }));
}
