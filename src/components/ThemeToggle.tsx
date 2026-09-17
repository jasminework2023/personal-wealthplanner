import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";
const KEY = "wealthplanner_theme";
function applyTheme(theme: "light" | "dark") { document.documentElement.dataset.theme = theme; localStorage.setItem(KEY, theme); }
export function ThemeToggle() { const [theme,setTheme]=useState<"light"|"dark">(()=>localStorage.getItem(KEY)==="dark"?"dark":"light"); useEffect(()=>{applyTheme(theme)},[theme]); const dark=theme==="dark"; return <button type="button" onClick={()=>setTheme(dark?"light":"dark")} aria-label={dark?"Gunakan mode terang":"Gunakan mode gelap"} title={dark?"Mode terang":"Mode gelap"} className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-charcoal/12 bg-white text-charcoal/70 hover:bg-charcoal/5">{dark?<Sun size={17}/>:<Moon size={17}/>}</button>; }
