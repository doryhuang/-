import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Truck, 
  User, 
  Copy, 
  CheckCircle2, 
  Info,
  Settings,
  PlusCircle,
  History,
  Trash2,
  ChevronDown
} from 'lucide-react';

interface Profile {
  name: string;
  phone: string;
  address: string;
  itemType: string;
  itemName: string;
  remarks: string;
  isFreightCollect: boolean;
}

interface Recipient {
  name: string;
  phone: string; 
  address: string;
}

export default function App() {
  const [sender, setSender] = useState<Profile>(() => {
    const saved = localStorage.getItem('takkyubin_sender');
    // 確保預設不勾選運費到付
    if (saved) {
      const parsed = JSON.parse(saved);
      return { 
        ...parsed, 
        itemType: parsed.itemType || '其他',
        itemName: parsed.itemName || 'Furbo 攝影機',
        remarks: parsed.remarks || '到貨前請先電聯, 謝謝',
        isFreightCollect: parsed.isFreightCollect ?? false 
      };
    }
    return { 
      name: '友愉股份有限公司', 
      phone: '02-27168801', 
      address: '台北市松山區民權東路三段178號4樓',
      itemType: '其他',
      itemName: 'Furbo 攝影機',
      remarks: '到貨前請先電聯, 謝謝',
      isFreightCollect: false
    };
  });

  const [recipient, setRecipient] = useState<Recipient>({
    name: '',
    phone: '',
    address: '',
  });

  const [shipDate, setShipDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0].replace(/-/g, '/');
  });

  const [deliveryDate, setDeliveryDate] = useState(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0].replace(/-/g, '/');
  });

  const [quickPaste, setQuickPaste] = useState('');
  const [copied, setCopied] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);

  useEffect(() => {
    localStorage.setItem('takkyubin_sender', JSON.stringify(sender));
  }, [sender]);

  const handleQuickPaste = (text: string) => {
    // 移除前後各種可能的引號 (包含英文、中文、全形引號)
    const cleanText = text.trim().replace(/^["'「『"＂]+|["'」』"＂]+$/g, '');
    setQuickPaste(cleanText);
    
    const newRecipient = { ...recipient };
    // 支援多種分隔符號，並移除空行
    const lines = cleanText.split(/[\n\r,，;；]/).filter(l => l.trim());
    
    lines.forEach(line => {
      const cleanLine = line.trim();
      // 姓名解析 (支援 收件人：, 姓名：, 姓名:, 姓名 )
      if (cleanLine.match(/(收件人|姓名)[：:\s]/)) {
        newRecipient.name = cleanLine.replace(/.*(收件人|姓名)[：:\s]/, '').trim();
      }
      // 地址解析
      else if (cleanLine.match(/地址[：:\s]/)) {
        newRecipient.address = cleanLine.replace(/.*地址[：:\s]/, '').trim();
      }
      // 手機/電話解析
      else if (cleanLine.match(/(手機|電話)[：:\s]/)) {
        newRecipient.phone = cleanLine.replace(/.*(手機|電話)[：:\s]/, '').trim();
      }
    });
    
    setRecipient(newRecipient);
  };

  const generateScript = () => {
    const data = {
      senderName: sender.name,
      senderPhone: sender.phone,
      senderAddress: sender.address,
      itemType: sender.itemType,
      itemName: sender.itemName,
      remarks: sender.remarks,
      recipientName: recipient.name,
      recipientPhone: recipient.phone,
      recipientAddress: recipient.address,
      shipDate: shipDate,
      deliveryDate: deliveryDate,
      isFreightCollect: sender.isFreightCollect
    };

    const script = `
(function() {
  try {
    const data = ${JSON.stringify(data)};
    console.log('🚀 黑貓助手啟動...', data);

    function triggerEvents(el, type) {
      if (!el) return;
      el.setAttribute('data-autofilled', 'true');
      if (type) el.setAttribute('data-field-type', type);
      
      // 強力觸發事件，繞過 React/Vue 的攔截
      try {
        const nativeValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")?.set;
        const nativeSelectSetter = Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, "value")?.set;
        const nativeTextAreaSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, "value")?.set;
        
        if (el instanceof HTMLInputElement && nativeValueSetter) {
          nativeValueSetter.call(el, el.value);
        } else if (el instanceof HTMLSelectElement && nativeSelectSetter) {
          nativeSelectSetter.call(el, el.value);
        } else if (el instanceof HTMLTextAreaElement && nativeTextAreaSetter) {
          nativeTextAreaSetter.call(el, el.value);
        }
      } catch (e) {}

      // 僅觸發必要的事件，減少對網頁後端驗證的干擾
      ['input', 'change'].forEach(name => {
        el.dispatchEvent(new Event(name, { bubbles: true }));
      });
    }

    // 強力填入函數：快速重複填入幾次，確保 React/Vue 狀態同步，但不造成長時間延遲
    function forceValue(el, value, type, times = 4) {
      if (!el || value === undefined) return;
      
      // 優先級鎖定：一旦被標記為品名 (product-name)，除非再次以 product-name 填入，否則禁止修改
      const currentLock = el.getAttribute('data-force-locked');
      if (currentLock === 'product-name' && type !== 'product-name') {
        console.log('🚫 攔截：非品名邏輯試圖覆蓋已鎖定的品名欄位');
        return;
      }
      
      // 如果填入的值包含「到貨前請先電聯」且目前是品名邏輯，這可能是邏輯錯誤，攔截它
      if (type === 'product-name' && typeof value === 'string' && value.includes('到貨前請先電聯')) {
        console.log('⚠️ 偵測到異常：品名邏輯試圖填入備註內容，已攔截');
        return;
      }
      
      if (type) el.setAttribute('data-force-locked', type);

      let count = 0;
      // 縮短間隔到 100ms，總共執行 4 次 (共 0.4s)，達到即時填入效果
      const interval = setInterval(() => {
        if (el.tagName === 'SELECT') {
          const valStr = String(value).trim();
          let found = false;
          for (let i = 0; i < el.options.length; i++) {
            const optText = el.options[i].text.trim();
            if (optText === valStr || el.options[i].value === valStr) {
              el.selectedIndex = i;
              found = true;
              break;
            }
          }
          if (!found) {
            for (let i = 0; i < el.options.length; i++) {
              if (el.options[i].text.includes(valStr)) {
                el.selectedIndex = i;
                found = true;
                break;
              }
            }
          }
        } else if (el.type === 'checkbox') {
          el.checked = !!value;
        } else {
          el.value = value;
        }
        
        triggerEvents(el, type);
        count++;
        if (count >= times) clearInterval(interval);
      }, 100);
    }

    function fillByLabel(root, labelText, value, extraValue) {
      if (!value) return false;
      console.log('🔍 嘗試匹配標籤:', labelText, '->', value);
      
      const searchTexts = [
        labelText, 
        '*' + labelText, 
        '＊' + labelText,
        labelText + '：', 
        labelText + ':', 
        labelText + '*', 
        '*' + labelText + '：',
        labelText.split('').join(' '), // 處理 "備 註" 這種空格
        labelText.split('').join('  ')
      ];
      
      for (const text of searchTexts) {
        const xpath = ".//*[(self::td or self::th or self::span or self::label or self::div) and normalize-space(.)='" + text + "']";
        const iterator = root.evaluate(xpath, root, null, XPathResult.ORDERED_NODE_ITERATOR_TYPE, null);
        let labelNode = iterator.iterateNext();
        
        while (labelNode) {
          // 尋找輸入框的邏輯：先看同一個 td，再看下一個 td，最後看整列 tr
          let inputs = [];
          const td = labelNode.closest('td') || labelNode.closest('th');
          if (td) {
            inputs = Array.from(td.querySelectorAll('input:not([type="hidden"]), textarea, select'));
            if (inputs.length === 0 && td.nextElementSibling) {
              inputs = Array.from(td.nextElementSibling.querySelectorAll('input:not([type="hidden"]), textarea, select'));
            }
          }
          
          if (inputs.length === 0) {
            const tr = labelNode.closest('tr');
            if (tr) inputs = Array.from(tr.querySelectorAll('input:not([type="hidden"]), textarea, select'));
          }

          if (inputs.length > 0) {
            const selectEl = inputs.find(el => el.tagName === 'SELECT');
            
            // 關鍵修正：填寫「備註」時，如果該行有 SELECT (下拉選單)，通常是品名行，應跳過
            if ((labelText === '備註' || labelText === '備註欄') && selectEl) {
              labelNode = iterator.iterateNext();
              continue;
            }

            if (selectEl) {
              let found = false;
              console.log('📦 發現選單，嘗試匹配選項:', value);
              for (let i = 0; i < selectEl.options.length; i++) {
                const optText = selectEl.options[i].text.trim();
                if (optText.includes(value) || (value === '其他' && (optText.includes('其它') || i === selectEl.options.length - 1))) {
                  selectEl.selectedIndex = i;
                  found = true;
                  console.log('✅ 匹配成功:', optText, '索引:', i);
                  break;
                }
              }
              
              if (found) {
                triggerEvents(selectEl);
                if (typeof selectEl.onchange === 'function') selectEl.onchange();
                console.log('🎯 標籤匹配成功 (Select):', text);
                
                // 強力維持選單狀態
                forceValue(selectEl, selectEl.selectedIndex, 'select-menu', 5);

                if (extraValue) {
                  const labelSnapshot = labelNode;
                  const fillExtra = (isRetry = false) => {
                    const tr = labelSnapshot.closest('tr');
                    if (!tr) return false;
                    const freshInputs = Array.from(tr.querySelectorAll('input:not([type="hidden"]), textarea'));
                    const target = freshInputs.find(el => 
                      (el.tagName === 'INPUT' && !['checkbox', 'radio', 'button', 'submit'].includes(el.type)) || 
                      el.tagName === 'TEXTAREA'
                    );
                    
                    if (target) {
                      forceValue(target, extraValue, 'extra-field', isRetry ? 5 : 10);
                      console.log('✅ 已啟動強力填入額外內容:', extraValue);
                      return true;
                    }
                    return false;
                  };

                  fillExtra(false);
                }
                return true;
              }
            } else {
            // 優先尋找尚未被填寫過的輸入框
            let target = inputs.find(i => !i.hasAttribute('data-autofilled'));
            
            // 如果是填寫備註，絕對不要動到品名內容框
            if (labelText.includes('備註')) {
              target = inputs.find(i => !i.hasAttribute('data-autofilled') && i.getAttribute('data-force-locked') !== 'product-name');
            }
            
            if (!target) {
              // 如果已經填過且是備註，則不重複填寫，避免誤傷
              if (labelText.includes('備註')) return false;
              target = inputs[0];
            }
            
            // 再次檢查鎖定狀態
            if (target.getAttribute('data-force-locked') === 'product-name' && labelText.includes('備註')) {
              console.log('⚠️ 備註邏輯試圖覆蓋已鎖定的品名框，已攔截');
              return false;
            }

            forceValue(target, value, labelText.includes('備註') ? 'remarks' : null, 10);
            console.log('🎯 標籤匹配成功 (Input):', text);
            return true;
            }
          }
          labelNode = iterator.iterateNext();
        }
      }
      
      // 模糊匹配作為最後手段
      if (labelText !== '備註' && labelText !== '備註欄') {
        const fuzzyXpath = ".//*[(self::td or self::th or self::span or self::label) and contains(normalize-space(.), '" + labelText + "')]";
        const result = document.evaluate(fuzzyXpath, root, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
        if (result) {
          const tr = result.closest('tr');
          if (tr) {
            const input = tr.querySelector('input:not([type="hidden"]), textarea, select');
            if (input) {
              input.value = value;
              triggerEvents(input);
              console.log('🎯 模糊匹配成功:', labelText);
              return true;
            }
          }
        }
      }
      return false;
    }

    function fillById(root, keyword, value) {
      if (!value) return false;
      // 優先精確匹配
      let el = root.querySelector('input[id="' + keyword + '"], textarea[id="' + keyword + '"], input[name="' + keyword + '"]');
      if (!el) {
        // 模糊匹配
        el = root.querySelector('input[id*="' + keyword + '" i], textarea[id*="' + keyword + '" i], input[name*="' + keyword + '" i]');
      }
      if (el) {
        if (el.type === 'checkbox') el.checked = !!value;
        else el.value = value;
        triggerEvents(el);
        console.log('✅ 已透過 ID 填入:', keyword);
        return true;
      }
      return false;
    }

    function runAutoFill(root) {
      let count = 0;
      console.log('🚀 填單助手啟動...', data);

      // 1. 填寫收件人與寄件人基本資訊
      const basicFields = [
        ['收件人姓名', data.recipientName], 
        ['收件人電話', data.recipientPhone], 
        ['收件人地址', data.recipientAddress],
        ['寄件人姓名', data.senderName], 
        ['寄件人電話', data.senderPhone], 
        ['寄件人地址', data.senderAddress],
        ['出貨日期', data.shipDate], 
        ['配達日期', data.deliveryDate]
      ];
      basicFields.forEach(([l, v]) => { if(fillByLabel(root, l, v)) count++; });
      
      // 2. 品名專屬處理
      console.log('📦 填寫品名:', data.itemType, data.itemName);
      // 先嘗試填寫選單 (如: 其他)
      fillByLabel(root, '品名', data.itemType);
      
      // 強力填入品名內容
      // 尋找「品名」文字，並填入其右側的輸入框
      let itemFilled = false;
      const itemXpath = ".//*[(self::td or self::th or self::span or self::label) and (text()='品名' or contains(., '品名'))]";
      const itemResult = root.evaluate(itemXpath, root, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
      for (let i = 0; i < itemResult.snapshotLength; i++) {
        const node = itemResult.snapshotItem(i);
        const tr = node.closest('tr');
        if (tr) {
          const inputs = Array.from(tr.querySelectorAll('input:not([type="hidden"]), textarea'));
          // 尋找該行中合適的輸入框 (排除下拉選單本身)
          const target = inputs.find(input => input.id.toLowerCase().includes('product') || input.name.toLowerCase().includes('product') || input.type === 'text');
          if (target) {
            forceValue(target, data.itemName, 'product-name', 6);
            console.log('✅ 已填入品名內容到「品名」右側:', data.itemName);
            itemFilled = true;
            break;
          }
        }
      }
      
      // 雙重保險：透過 ID 填寫
      const prodInput = root.querySelector('input[id*="ProductName" i], input[name*="ProductName" i], input[id*="txtItemName" i]');
      if (prodInput) {
        forceValue(prodInput, data.itemName, 'product-name', 6);
        itemFilled = true;
      }
      if (itemFilled) count++;

      // 3. 備註專屬處理 (最下方)
      console.log('📦 填寫備註:', data.remarks);
      if (data.remarks) {
        const remarkIds = ['txtMemo', 'txtRemark', 'Memo', 'notes'];
        let remarkFilled = false;
        for (const id of remarkIds) {
          const el = root.getElementById(id);
          if (el && (el.tagName === 'TEXTAREA' || (el.tagName === 'INPUT' && el.type === 'text'))) {
            forceValue(el, data.remarks, 'remarks', 10);
            console.log('✅ 已透過精確 ID 強力填入備註:', id);
            remarkFilled = true;
            break;
          }
        }
        
        if (!remarkFilled) {
          if (fillByLabel(root, '備註', data.remarks)) {
            remarkFilled = true;
          } else if (fillByLabel(root, '備註欄', data.remarks)) {
            remarkFilled = true;
          }
        }
        if (remarkFilled) count++;
      }

      if (data.isFreightCollect) fillByLabel(root, '運費到付', true);
      
      // 4. 最後補強 (針對可能遺漏的 ID)
      const finalIds = [
        ['ReceiverName', data.recipientName], ['ReceiverTel', data.recipientPhone], ['ReceiverAddr', data.recipientAddress],
        ['SenderName', data.senderName], ['SenderTel', data.senderPhone], ['SenderAddr', data.senderAddress],
        ['ProductName', data.itemName], ['ReceiverMobile', data.recipientPhone]
      ];
      finalIds.forEach(([k, v]) => { if(fillById(root, k, v)) count++; });

      return count;
    }

    let total = runAutoFill(document);
    document.querySelectorAll('iframe').forEach(f => {
      try {
        const doc = f.contentDocument || f.contentWindow.document;
        if (doc) total += runAutoFill(doc);
      } catch (e) {}
    });
    alert('填單完成！成功填入 ' + total + ' 個欄位。');
  } catch (e) { alert('錯誤: ' + e.message); }
})();
    `.trim();
    return script;
  };

  const bookmarkletElementRef = useRef<HTMLAnchorElement | null>(null);

  // 使用 Callback Ref 確保在元素掛載時正確設定 href，解決分頁切換後的失效問題
  const setBookmarkletRef = (el: HTMLAnchorElement | null) => {
    bookmarkletElementRef.current = el;
    if (el) {
      const url = "javascript:" + encodeURIComponent(generateScript());
      el.setAttribute('href', url);
    }
  };

  useEffect(() => {
    if (bookmarkletElementRef.current) {
      const url = "javascript:" + encodeURIComponent(generateScript());
      bookmarkletElementRef.current.setAttribute('href', url);
    }
  }, [sender, recipient, shipDate, deliveryDate]);

  const copyToClipboard = () => {
    const script = generateScript();
    navigator.clipboard.writeText(script);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  useEffect(() => {
    localStorage.setItem('takkyubin_sender', JSON.stringify(sender));
  }, [sender]);

  return (
    <div className="min-h-screen bg-slate-50 pb-12">
      <header className="bg-yamato-yellow border-b border-yamato-black/10 sticky top-0 z-10 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-yamato-black rounded-lg flex items-center justify-center text-yamato-yellow shadow-md">
              <Truck size={24} />
            </div>
            <div>
              <h1 className="font-bold text-lg text-yamato-black leading-tight">黑貓契約客戶填單助手</h1>
              <p className="text-[10px] text-yamato-black/60 font-bold tracking-wider uppercase">Takkyubin Auto-Filler</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 space-y-8">
        {/* 1. 執行區 (最上面) */}
        <div className="glass-card rounded-2xl p-6 bg-gradient-to-br from-yamato-yellow/10 to-white border-yamato-yellow/30">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <Truck className="text-yamato-black" size={20} />
                <h3 className="font-bold text-slate-900">拖曳書籤</h3>
              </div>
              <p className="text-sm text-slate-600">將下方按鈕拖曳至瀏覽器書籤列，設定好資料後在黑貓網頁點擊它。</p>
            </div>
            
            <div className="flex flex-wrap gap-3 justify-center md:justify-end">
              <a 
                ref={setBookmarkletRef}
                className="btn-primary flex items-center gap-3 cursor-move scale-110 py-3 px-8"
                title="將此按鈕拖曳到你的瀏覽器書籤列"
                onClick={(e) => {
                  if (e.currentTarget.getAttribute('href')?.startsWith('javascript:')) {
                    e.preventDefault();
                    alert('請將此按鈕「拖曳」到書籤列，而不是直接點擊。');
                  }
                }}
              >
                <Truck size={24} />
                <span className="text-lg font-bold">拖曳書籤</span>
              </a>
            </div>
          </div>

          <div className="mt-6">
            <button 
              onClick={() => setShowInstructions(!showInstructions)}
              className="flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-yamato-black transition-colors"
            >
              <Info size={16} />
              使用說明
              <motion.div
                animate={{ rotate: showInstructions ? 180 : 0 }}
                transition={{ duration: 0.2 }}
              >
                <ChevronDown size={16} />
              </motion.div>
            </button>

            <AnimatePresence>
              {showInstructions && (
                <motion.div 
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="mt-3 p-4 bg-yamato-yellow/10 rounded-xl border border-yamato-yellow/30">
                    <div className="flex gap-3">
                      <div className="text-xs text-slate-700 leading-relaxed">
                        <ul className="list-disc list-inside space-y-1 opacity-90">
                          <li>將上方「拖曳書籤」按鈕**按住並拖到**瀏覽器的書籤列。</li>
                          <li>在下方填寫收件人資料，或修改固定資訊。</li>
                          <li>前往黑貓契約客戶網頁，點擊書籤列上的該書籤即可自動填單。</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* 2. 快速貼上 */}
        <div className="glass-card rounded-2xl p-6 border-l-4 border-l-yamato-yellow">
          <div className="flex items-center gap-2 mb-4">
            <Copy className="text-yamato-black" size={20} />
            <h2 className="font-bold text-slate-800">快速貼上解析</h2>
          </div>
          <textarea 
            className="input-field h-24 text-sm font-mono"
            placeholder="直接貼上：&#10;姓名：程XX&#10;地址：台中市XXXXXXXXXXX&#10;手機：09XXXXXXX"
            value={quickPaste}
            onChange={(e) => handleQuickPaste(e.target.value)}
          />
          <p className="mt-2 text-xs text-slate-400 italic">貼上後，下方的收件人欄位會自動更新。</p>
        </div>

        {/* 3. 收件人資訊 */}
        <div className="glass-card rounded-2xl p-6 border-l-4 border-l-yamato-black">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <User className="text-yamato-black" size={20} />
              <h2 className="font-bold text-slate-800">收件人資訊</h2>
            </div>
            <button 
              onClick={() => setRecipient({ name: '', phone: '', address: '' })}
              className="text-xs text-slate-400 hover:text-yamato-black flex items-center gap-1 transition-colors"
            >
              <Trash2 size={14} /> 清除收件人
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-600">收件人姓名</label>
              <input 
                type="text" 
                className="input-field"
                placeholder="王小明"
                value={recipient.name}
                onChange={(e) => setRecipient({...recipient, name: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-600">收件人手機</label>
              <input 
                type="text" 
                className="input-field"
                placeholder="0912345678"
                value={recipient.phone}
                onChange={(e) => setRecipient({...recipient, phone: e.target.value})}
              />
            </div>
            <div className="md:col-span-2 space-y-2">
              <label className="text-sm font-semibold text-slate-600">收件地址</label>
              <input 
                type="text" 
                className="input-field"
                placeholder="台中市..."
                value={recipient.address}
                onChange={(e) => setRecipient({...recipient, address: e.target.value})}
              />
            </div>
          </div>
        </div>

        {/* 4. 寄件日期 */}
        <div className="glass-card rounded-2xl p-6 border-l-4 border-l-yamato-green">
          <div className="flex items-center gap-2 mb-6">
            <History className="text-yamato-green" size={20} />
            <h2 className="font-bold text-slate-800">寄件日期</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-600">出貨日期</label>
              <input 
                type="text" 
                className="input-field"
                value={shipDate}
                onChange={(e) => setShipDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-600">預定配達日期</label>
              <input 
                type="text" 
                className="input-field"
                value={deliveryDate}
                onChange={(e) => setDeliveryDate(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* 5. 固定資訊設定 */}
        <div className="glass-card rounded-2xl p-6 border-l-4 border-l-slate-400">
          <div className="flex items-center gap-2 mb-6">
            <Settings className="text-slate-500" size={20} />
            <h2 className="font-bold text-slate-800">固定資訊設定</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-600">寄件人姓名</label>
              <input 
                type="text" 
                className="input-field"
                value={sender.name}
                onChange={(e) => setSender({...sender, name: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-600">寄件人電話</label>
              <input 
                type="text" 
                className="input-field"
                value={sender.phone}
                onChange={(e) => setSender({...sender, phone: e.target.value})}
              />
            </div>
            <div className="md:col-span-2 space-y-2">
              <label className="text-sm font-semibold text-slate-600">寄件地址</label>
              <input 
                type="text" 
                className="input-field"
                value={sender.address}
                onChange={(e) => setSender({...sender, address: e.target.value})}
              />
            </div>
            <div className="flex items-center gap-3 md:col-span-2 p-3 bg-blue-50 rounded-xl border border-blue-100">
              <input 
                type="checkbox" 
                id="isFreightCollect"
                className="w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                checked={sender.isFreightCollect}
                onChange={(e) => setSender({...sender, isFreightCollect: e.target.checked})}
              />
              <label htmlFor="isFreightCollect" className="text-sm font-bold text-slate-700 cursor-pointer">
                預設勾選「運費到付」
              </label>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-600">品名選單 (如：其他)</label>
              <input 
                type="text" 
                className="input-field"
                value={sender.itemType}
                onChange={(e) => setSender({...sender, itemType: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-600">品名內容</label>
              <input 
                type="text" 
                className="input-field"
                value={sender.itemName}
                onChange={(e) => setSender({...sender, itemName: e.target.value})}
              />
            </div>
            <div className="md:col-span-2 space-y-2">
              <label className="text-sm font-semibold text-slate-600">備註 (最下方欄位)</label>
              <input 
                type="text" 
                className="input-field"
                placeholder="例如：到貨前請先電聯，謝謝"
                value={sender.remarks}
                onChange={(e) => setSender({...sender, remarks: e.target.value})}
              />
            </div>
          </div>

          <div className="mt-8 p-4 bg-slate-50 rounded-xl text-xs text-slate-500">
            <p>※ 這些資訊將會被儲存在您的瀏覽器中，下次開啟時會自動帶入。</p>
          </div>
        </div>
      </main>

      <footer className="max-w-4xl mx-auto px-4 text-center py-8">
        <p className="text-slate-400 text-sm">
          本工具專為黑貓宅急便「契約客戶專區」設計。
        </p>
      </footer>
    </div>
  );
}
