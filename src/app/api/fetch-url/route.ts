import { NextRequest, NextResponse } from 'next/server'
import { selectParser } from '@/lib/parsers'
import * as cheerio from 'cheerio'

const BOOK_EXTENSIONS = ['.epub', '.fb2', '.fb2.zip']
const BOOK_CONTENT_TYPES = ['application/epub+zip', 'application/zip', 'application/octet-stream']

const PICKER_SCRIPT = `<script>
(function(){
  var selected=[];
  var hoveredEl=null;
  var isMobile=!window.matchMedia('(hover:hover)').matches;
  if(isMobile){window.parent.postMessage({type:'narrify-no-hover'},'*');return;}
  document.addEventListener('mouseover',function(e){
    if(hoveredEl&&!selected.find(function(s){return s.el===hoveredEl;}))
      hoveredEl.style.outline='';
    hoveredEl=e.target;
    if(!selected.find(function(s){return s.el===hoveredEl;}))
      hoveredEl.style.outline='2px solid #6366f1';
  },true);
  document.addEventListener('click',function(e){
    e.preventDefault();e.stopPropagation();
    var el=e.target;
    if(!e.shiftKey){selected.forEach(function(s){s.el.style.outline='';});selected=[];}
    var idx=selected.findIndex(function(s){return s.el===el;});
    if(idx>=0){el.style.outline='';selected.splice(idx,1);}
    else{el.style.outline='3px solid #16a34a';selected.push({el:el,text:el.innerText||''});}
    window.parent.postMessage({
      type:'narrify-selection',
      selections:selected.map(function(s){return{text:s.text};})
    },'*');
  },true);
  window.parent.postMessage({type:'narrify-ready'},'*');
})();
</script>`

function isBookUrl(url: string, contentType: string): boolean {
  const path = url.toLowerCase().split('?')[0]
  if (BOOK_EXTENSIONS.some((ext) => path.endsWith(ext))) return true
  return BOOK_CONTENT_TYPES.some((ct) => contentType.startsWith(ct))
}

function injectScript(html: string): string {
  return html.includes('</body>') ? html.replace('</body>', PICKER_SCRIPT + '</body>') : html + PICKER_SCRIPT
}

type SemanticBlock = { label: string; selector: string; wordCount: number; text: string }

function extractSemanticBlocks(html: string): SemanticBlock[] {
  const $ = cheerio.load(html)
  $('script,style,noscript,nav,header,footer').remove()
  const blocks: SemanticBlock[] = []
  const seen = new Set<string>()

  for (const [sel, label] of [
    ['article', 'article'],
    ['main', 'main'],
    ['[role="main"]', 'main (role)'],
    ['section', 'section'],
  ] as [string, string][]) {
    $(sel).each((_, el) => {
      const text = $(el).text().trim()
      if (text.length < 50) return
      const key = text.slice(0, 60)
      if (seen.has(key)) return
      seen.add(key)
      const id = $(el).attr('id')
      const cls = $(el).attr('class')?.split(/\s+/)[0]
      const selector = id ? `${sel.split(',')[0]}#${id}` : cls ? `${sel.split(',')[0]}.${cls}` : sel.split(',')[0]
      blocks.push({ label, selector, wordCount: text.split(/\s+/).filter(Boolean).length, text })
    })
  }
  return blocks
}

export async function POST(req: NextRequest) {
  const { url, mode } = (await req.json()) as { url: string; mode?: 'blocks' }

  if (!url?.startsWith('http')) {
    return NextResponse.json({ type: 'error', message: 'Invalid URL' }, { status: 400 })
  }

  let res: Response
  try {
    res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Narrify/1.0)' },
      redirect: 'follow',
    })
  } catch {
    return NextResponse.json({ type: 'error', message: 'Failed to reach URL' }, { status: 502 })
  }

  if (!res.ok) {
    return NextResponse.json({ type: 'error', message: `Remote returned ${res.status}` }, { status: 502 })
  }

  const contentType = res.headers.get('content-type') ?? ''

  if (isBookUrl(url, contentType)) {
    try {
      const buffer = new Uint8Array(await res.arrayBuffer())
      const filename = url.split('/').pop()?.split('?')[0] ?? 'book'
      const chapters = await selectParser(filename).parse(buffer)
      return NextResponse.json({ type: 'chapters', chapters })
    } catch (err) {
      return NextResponse.json(
        { type: 'error', message: err instanceof Error ? err.message : 'Parse failed' },
        { status: 422 }
      )
    }
  }

  const html = await res.text()

  if (mode === 'blocks') {
    return NextResponse.json({ type: 'blocks', blocks: extractSemanticBlocks(html) })
  }

  return NextResponse.json({ type: 'html', html: injectScript(html) })
}
