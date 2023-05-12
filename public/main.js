window.addEventListener("DOMContentLoaded", scriptMain)

const $ = document.querySelector.bind(document)

const daysElement = () => "日月火水木金土".split("").map(id => document.getElementById(id))
const reset = () => daysElement().forEach(e => { e.innerText = "-" })

var syukujitsuCSV;
const fetchSyukujitsu = async () => {
  if (!syukujitsuCSV) {
    syukujitsuCSV = await fetch("/syukujitsu.csv").then(r => {
      if (!r.ok) throw new Error("not ok")
      return r.text()
    }).catch(r => { log(`failed to fetch syukujitsu.csv: ${r}`); throw r })
  }
  return syukujitsuCSV.split("\n")
    .filter(l => l.trim().length)
    .map(l => l.trim().split(","))
    .map(([ d, n ]) => [ (d.split("/").map(d => d.padStart(2, "0")).join("-")), n ])
    .map(([ d, n ]) => [ new Date(`${d}T09:00:00Z`), n ])
}

const RULES = ["holiday_jp"]
/**
 * @type {Record<string, (start: Date, end: Date, days: number[]) => void>}
 */
const RULE_PROCESSORS = {
  "holiday_jp": async (start, end, days) => {
    const 祝 = await fetchSyukujitsu()
    for (const [ 日, 名 ] of 祝) {
      if (start.getTime() <= 日.getTime() && 日.getTime() <= end.getTime()) {
        log(`${日.toISOString()}: ${名}`)
        days[日.getDay()]--
      }
    }
    log(days)
    daysElement().forEach((e, i) => {
      e.innerText = days[i]
    })
  }
}

const log = (text) => {
  const log = [`[${(new Date()).toISOString()}] ${text}`, $("#log").innerText].filter(t => t && t.trim().length).join("\n")
  $("#log").innerText = log
}


function scriptMain() {
  let defers = []
  defers.push(() => {
    $("#notice").textContent = "LET’S GO!!!!!!!"
  })

  scriptBody((f) => defers.push(f))

  for (const f of defers) {
    f()
  }
}

const yearmonthkey = (d) => ((d.getFullYear() << 4) + d.getMonth())

const scriptBody = (defer) => {
  $("#main").style = ""
  const calc = (form) => {
    const start = form.elements["start"].valueAsDate
    const end = form.elements["end"].valueAsDate || new Date()
    end.setHours(9)
    end.setMinutes(59)
    const rule = form.elements["rule"]["value"]

    let ok = true
    if (start == null) {
      log("start を指定してください")
      ok = false
    }
    if (start && end && start.getTime() > end.getTime()) {
      log("end は start 以後を指定してください")
      ok = false
    }
    if (!RULES.includes(rule)) {
      log(`rule の選択肢が [${RULES}] に含まれません`)
      ok = false
    }
    if (!ok) {
      reset()
      return
    }

    // その日を含んで日数を出してほしい
    start.setHours(0);
    end.setHours(23);
    const days = Math.ceil((end.getTime() - start.getTime())/1000/60/60/24)
    const dow = new Array(7).fill(0)
      // 曜日はクロスするので逆パターンを試している
      .map((_,i) => (start.getDay() <= i && i <= end.getDay()) || (end.getDay() <= i && i <= start.getDay()) ? Math.ceil(days/7) : Math.floor(days/7))
    log(`${days} 日, [${dow}] (${dow.reduce((a,b) => a+b, 0)})`)

    RULE_PROCESSORS[rule](start, end, dow)
  }
  $("#form").addEventListener("submit", (ev) => {
    calc(ev.target)
    return false
  })
  calc($("#form"))
}
