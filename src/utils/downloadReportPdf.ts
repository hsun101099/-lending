/**
 * 將報表頁面轉成可直接下載的 PDF 檔。
 *
 * 作法是把每一頁版面擷取成圖像後貼入 PDF，而非以文字方式寫入。
 * 原因是文字方式必須嵌入中文字型，字型檔動輒數 MB，且容易出現中文變空白方框；
 * 改由瀏覽器負責渲染中文，可確保與畫面上看到的完全一致。
 */

const A4_LANDSCAPE_WIDTH_MM = 297
const A4_LANDSCAPE_HEIGHT_MM = 210
const MARGIN_MM = 12

export function buildReportFileName(): string {
  const now = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `放款案件報表_${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}.pdf`
}

export async function downloadReportPdf(container: HTMLElement, fileName = buildReportFileName()): Promise<void> {
  // 產生 PDF 的套件體積較大，改在按下下載時才載入，避免拖慢平時開啟速度
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
    import('html2canvas-pro'),
    import('jspdf'),
  ])

  // 畫面上的預覽會等比縮小以配合視窗寬度，該縮放會讓擷取結果變形，
  // 因此在畫面外以原始尺寸複製一份版面，輸出一律以 A4 實際大小為準。
  const sandbox = document.createElement('div')
  sandbox.setAttribute('aria-hidden', 'true')
  sandbox.style.cssText = 'position:absolute;top:0;left:-100000px;z-index:-1;background:#fff;'
  const clone = container.cloneNode(true) as HTMLElement
  clone.style.transform = 'none'
  sandbox.appendChild(clone)
  document.body.appendChild(sandbox)

  try {
    const pageElements = Array.from(clone.querySelectorAll<HTMLElement>('[data-report-page]'))
    if (pageElements.length === 0) throw new Error('找不到可輸出的報表內容')

    const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
    const contentWidth = A4_LANDSCAPE_WIDTH_MM - MARGIN_MM * 2
    const contentHeight = A4_LANDSCAPE_HEIGHT_MM - MARGIN_MM * 2

    for (let i = 0; i < pageElements.length; i++) {
      const canvas = await html2canvas(pageElements[i], {
        scale: 2, // 提高解析度，列印時文字才不會糊
        backgroundColor: '#ffffff',
        logging: false,
      })

      // 等比縮放以完整置入版面範圍，避免內容被裁切
      const ratio = Math.min(contentWidth / canvas.width, contentHeight / canvas.height)
      const drawWidth = canvas.width * ratio
      const drawHeight = canvas.height * ratio

      if (i > 0) pdf.addPage()
      pdf.addImage(canvas.toDataURL('image/jpeg', 0.92), 'JPEG', MARGIN_MM, MARGIN_MM, drawWidth, drawHeight)
    }

    pdf.save(fileName)
  } finally {
    document.body.removeChild(sandbox)
  }
}
