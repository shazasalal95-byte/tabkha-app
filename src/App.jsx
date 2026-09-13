import React, { useState, useEffect, useCallback } from "react";
import {
  ChefHat, Search, MapPin, Phone, ShoppingCart, Plus, Minus,
  ArrowRight, Trash2, Package, Home, ClipboardList, Check,
} from "lucide-react";
import { supabase } from "./supabaseClient";

const CATS = [
  { id: "طبخ يومي", label: "طبخ يومي" },
  { id: "مونة", label: "مونة" },
  { id: "حلويات", label: "حلويات" },
  { id: "معجنات", label: "معجنات" },
  { id: "مناسف وعزايم", label: "مناسف وعزايم" },
];

const CAT_STYLE = {
  "طبخ يومي": { chip: "bg-pink-600 text-white", light: "bg-pink-50 text-pink-700" },
  "مونة": { chip: "bg-emerald-600 text-white", light: "bg-emerald-50 text-emerald-700" },
  "حلويات": { chip: "bg-amber-500 text-stone-950", light: "bg-amber-50 text-amber-700" },
  "معجنات": { chip: "bg-orange-600 text-white", light: "bg-orange-50 text-orange-700" },
  "مناسف وعزايم": { chip: "bg-red-700 text-white", light: "bg-red-50 text-red-700" },
};
function catLight(cat) {
  return (CAT_STYLE[cat] && CAT_STYLE[cat].light) || "bg-stone-100 text-stone-500";
}
function catChip(cat) {
  return (CAT_STYLE[cat] && CAT_STYLE[cat].chip) || "bg-pink-600 text-white";
}

function mapItem(it) {
  return { id: it.id, houseId: it.house_id, name: it.name, category: it.category, price: it.price, qty: it.qty };
}
function mapOrder(o) {
  return {
    id: o.id, houseId: o.house_id, houseName: o.house_name, items: o.items,
    total: o.total, address: o.address, note: o.note, status: o.status, createdAt: o.created_at,
  };
}

export default function TabkhaApp() {
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [houses, setHouses] = useState([]);
  const [items, setItems] = useState([]);
  const [orders, setOrders] = useState([]);

  const [tab, setTab] = useState("browse"); // browse | register | orders
  const [activeHouseId, setActiveHouseId] = useState(null);
  const [activeCat, setActiveCat] = useState(null);
  const [query, setQuery] = useState("");
  const [cart, setCart] = useState([]); // {itemId, qty}
  const [checkout, setCheckout] = useState(false);
  const [address, setAddress] = useState("");
  const [note, setNote] = useState("");
  const [orderDone, setOrderDone] = useState(false);
  const [houseTab, setHouseTab] = useState(null);

  const [ordersHouseId, setOrdersHouseId] = useState("");

  const refreshAll = useCallback(async () => {
    setLoadError("");
    try {
      const [housesRes, itemsRes, ordersRes] = await Promise.all([
        supabase.from("houses").select("*").order("created_at", { ascending: false }),
        supabase.from("items").select("*"),
        supabase.from("orders").select("*").order("created_at", { ascending: false }),
      ]);
      if (housesRes.error) throw housesRes.error;
      if (itemsRes.error) throw itemsRes.error;
      if (ordersRes.error) throw ordersRes.error;
      setHouses(housesRes.data || []);
      setItems((itemsRes.data || []).map(mapItem));
      setOrders((ordersRes.data || []).map(mapOrder));
    } catch (e) {
      console.error(e);
      setLoadError("ما قدرنا نجيب البيانات. تأكدي من إعدادات Supabase (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY).");
    }
    setLoading(false);
  }, []);

  useEffect(() => { refreshAll(); }, [refreshAll]);

  // ---------- browse ----------
  const filteredHouses = houses.filter((h) => {
    const matchesCat = !activeCat || (h.categories || []).includes(activeCat);
    const matchesQuery = !query || h.name.includes(query) || (h.area || "").includes(query);
    return matchesCat && matchesQuery;
  });

  const activeHouse = houses.find((h) => h.id === activeHouseId);
  const houseItems = items.filter((it) => it.houseId === activeHouseId);
  const houseCats = [...new Set(houseItems.map((it) => it.category))];

  function openHouse(id) {
    setActiveHouseId(id);
    setCart([]);
    setCheckout(false);
    setOrderDone(false);
    const cats = [...new Set(items.filter((it) => it.houseId === id).map((it) => it.category))];
    setHouseTab(cats[0] || null);
  }

  function addToCart(itemId) {
    setCart((c) => {
      const existing = c.find((x) => x.itemId === itemId);
      if (existing) return c.map((x) => x.itemId === itemId ? { ...x, qty: x.qty + 1 } : x);
      return [...c, { itemId, qty: 1 }];
    });
  }
  function changeQty(itemId, delta) {
    setCart((c) => c
      .map((x) => x.itemId === itemId ? { ...x, qty: x.qty + delta } : x)
      .filter((x) => x.qty > 0));
  }
  const cartCount = cart.reduce((s, x) => s + x.qty, 0);
  const cartLines = cart.map((c) => {
    const item = items.find((it) => it.id === c.itemId);
    return item ? { ...item, qty: c.qty } : null;
  }).filter(Boolean);
  const cartTotal = cartLines.reduce((s, l) => s + l.price * l.qty, 0);
  const deliveryFee = cartLines.length ? 5000 : 0;

  async function confirmOrder() {
    if (!address.trim() || !activeHouse) return;
    const payload = {
      house_id: activeHouse.id,
      house_name: activeHouse.name,
      items: cartLines.map((l) => ({ name: l.name, qty: l.qty, price: l.price })),
      total: cartTotal + deliveryFee,
      address, note,
      status: "قيد التحضير",
    };
    const { data, error } = await supabase.from("orders").insert([payload]).select();
    if (!error && data && data[0]) {
      setOrders((prev) => [mapOrder(data[0]), ...prev]);
    }
    setOrderDone(true);
    setCart([]);
    setAddress(""); setNote("");
  }

  // ---------- register ----------
  const [regName, setRegName] = useState("");
  const [regArea, setRegArea] = useState("");
  const [regPhone, setRegPhone] = useState("");
  const [regDesc, setRegDesc] = useState("");
  const [regCats, setRegCats] = useState([]);
  const [regItems, setRegItems] = useState([{ name: "", category: "", price: "", qty: "" }]);
  const [regDone, setRegDone] = useState(false);
  const [regError, setRegError] = useState("");
  const [regSubmitting, setRegSubmitting] = useState(false);

  function toggleRegCat(c) {
    setRegCats((cs) => cs.includes(c) ? cs.filter((x) => x !== c) : [...cs, c]);
  }
  function updateRegItem(idx, field, val) {
    setRegItems((list) => list.map((it, i) => i === idx ? { ...it, [field]: val } : it));
  }
  function addRegItemRow() {
    setRegItems((list) => [...list, { name: "", category: regCats[0] || "", price: "", qty: "" }]);
  }
  function removeRegItemRow(idx) {
    setRegItems((list) => list.filter((_, i) => i !== idx));
  }

  async function submitRegistration() {
    setRegError("");
    if (!regName.trim() || !regArea.trim() || regCats.length === 0) {
      setRegError("لازم تعبي اسم بيت الطبخ، المنطقة، وتختاري اختصاص وحدة عالأقل.");
      return;
    }
    const validItems = regItems.filter((it) => it.name.trim() && it.category && it.price);
    if (validItems.length === 0) {
      setRegError("لازم تضيفي صنف واحد عالأقل معه اسم، تصنيف، وسعر.");
      return;
    }
    setRegSubmitting(true);
    const { data: houseData, error: houseErr } = await supabase.from("houses").insert([{
      name: regName.trim(), area: regArea.trim(), phone: regPhone.trim(),
      description: regDesc.trim(), categories: regCats,
    }]).select();

    if (houseErr || !houseData || !houseData[0]) {
      setRegError("صار في مشكلة بالحفظ، حاولي مرة تانية.");
      setRegSubmitting(false);
      return;
    }
    const houseId = houseData[0].id;
    const itemsPayload = validItems.map((it) => ({
      house_id: houseId, name: it.name.trim(), category: it.category,
      price: Number(it.price) || 0, qty: Number(it.qty) || 0,
    }));
    const { data: itemsData, error: itemsErr } = await supabase.from("items").insert(itemsPayload).select();

    setHouses((prev) => [houseData[0], ...prev]);
    if (!itemsErr && itemsData) {
      setItems((prev) => [...prev, ...itemsData.map(mapItem)]);
    }
    setRegSubmitting(false);
    setRegDone(true);
    setRegName(""); setRegArea(""); setRegPhone(""); setRegDesc("");
    setRegCats([]); setRegItems([{ name: "", category: "", price: "", qty: "" }]);
  }

  // ---------- orders (house owner) ----------
  const myOrders = orders.filter((o) => o.houseId === ordersHouseId);
  async function toggleOrderStatus(orderId) {
    const order = orders.find((o) => o.id === orderId);
    if (!order) return;
    const newStatus = order.status === "قيد التحضير" ? "تم التسليم" : "قيد التحضير";
    const { error } = await supabase.from("orders").update({ status: newStatus }).eq("id", orderId);
    if (!error) {
      setOrders((prev) => prev.map((o) => o.id === orderId ? { ...o, status: newStatus } : o));
    }
  }

  const fontStyle = { fontFamily: "'Tajawal', sans-serif" };
  const titleFontStyle = { fontFamily: "'Reem Kufi', sans-serif" };

  if (loading) {
    return (
      <div dir="rtl" style={fontStyle} className="flex items-center justify-center py-24 text-stone-500">
        عم نجهز طبخة...
      </div>
    );
  }

  return (
    <div dir="rtl" style={fontStyle} className="max-w-md mx-auto bg-white min-h-[600px] rounded-3xl overflow-hidden border border-stone-200 flex flex-col">
      <div className="bg-pink-600 text-amber-50 px-5 py-4 flex items-center gap-2">
        <ChefHat size={22} />
        <span style={titleFontStyle} className="text-xl">طبخة</span>
      </div>

      {loadError && (
        <div className="bg-red-50 text-red-700 text-xs p-3 text-center">{loadError}</div>
      )}

      <div className="flex-1 overflow-y-auto p-4">

        {/* ---------------- BROWSE ---------------- */}
        {tab === "browse" && !activeHouseId && (
          <div>
            <div className="flex items-center gap-2 bg-white border border-stone-200 rounded-xl px-3 py-2 mb-3">
              <Search size={18} className="text-stone-400" />
              <input
                value={query} onChange={(e) => setQuery(e.target.value)}
                placeholder="دوّري عبيت طبخ أو منطقة"
                className="flex-1 bg-transparent outline-none text-sm placeholder-stone-400"
              />
            </div>
            <div className="flex gap-2 overflow-x-auto mb-4 pb-1">
              <button onClick={() => setActiveCat(null)}
                className={`text-sm px-3 py-1.5 rounded-full whitespace-nowrap ${!activeCat ? "bg-pink-600 text-white" : "bg-white border border-stone-200 text-stone-500"}`}>الكل</button>
              {CATS.map((c) => (
                <button key={c.id} onClick={() => setActiveCat(c.id)}
                  className={`text-sm px-3 py-1.5 rounded-full whitespace-nowrap ${activeCat === c.id ? catChip(c.id) : "bg-white border border-stone-200 text-stone-500"}`}>
                  {c.label}
                </button>
              ))}
            </div>

            {filteredHouses.length === 0 && (
              <div className="text-center text-stone-400 text-sm py-16">
                <Package className="mx-auto mb-2" size={28} />
                ولا بيت طبخ مسجل هلق بهاي الفئة.<br />أول ما حدا يسجل رح يطلع هون.
              </div>
            )}

            <div className="flex flex-col gap-3">
              {filteredHouses.map((h) => (
                <button key={h.id} onClick={() => openHouse(h.id)}
                  className="flex gap-3 bg-white border border-stone-200 rounded-2xl p-3 text-right hover:border-pink-300 transition">
                  <div className={`w-16 h-16 rounded-xl flex items-center justify-center flex-shrink-0 ${catLight((h.categories || [])[0])}`}>
                    <ChefHat size={26} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-stone-800 text-sm">{h.name}</div>
                    <div className="text-xs text-stone-500 flex items-center gap-1 mt-0.5">
                      <MapPin size={12} /> {h.area}
                    </div>
                    <div className="flex gap-1 mt-1.5 flex-wrap">
                      {(h.categories || []).slice(0, 3).map((c) => (
                        <span key={c} className={`text-[11px] px-2 py-0.5 rounded-full ${catLight(c)}`}>{c}</span>
                      ))}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ---------------- HOUSE DETAIL ---------------- */}
        {tab === "browse" && activeHouseId && activeHouse && (
          <div>
            {!checkout && (
              <>
                <button onClick={() => setActiveHouseId(null)} className="flex items-center gap-1 text-sm text-stone-500 mb-3">
                  <ArrowRight size={16} /> رجوع
                </button>
                <div className={`w-full h-24 rounded-2xl flex items-center justify-center mb-3 ${catLight((activeHouse.categories || [])[0])}`}>
                  <ChefHat size={30} />
                </div>
                <div className="font-medium text-stone-800 mb-1">{activeHouse.name}</div>
                <div className="text-xs text-stone-500 mb-1">{activeHouse.description}</div>
                <div className="text-xs text-stone-500 flex items-center gap-3 mb-3">
                  <span className="flex items-center gap-1"><MapPin size={12} />{activeHouse.area}</span>
                  {activeHouse.phone && <span className="flex items-center gap-1"><Phone size={12} />{activeHouse.phone}</span>}
                </div>

                {houseCats.length > 0 && (
                  <div className="flex gap-4 border-b border-stone-200 mb-3 text-sm">
                    {houseCats.map((c) => (
                      <button key={c} onClick={() => setHouseTab(c)}
                        className={`pb-2 ${houseTab === c ? "border-b-2 border-pink-600 text-pink-700 font-medium" : "text-stone-400"}`}>
                        {c}
                      </button>
                    ))}
                  </div>
                )}

                <div className="flex flex-col gap-2 mb-20">
                  {houseItems.filter((it) => it.category === houseTab).map((it) => {
                    const inCart = cart.find((c) => c.itemId === it.id);
                    return (
                      <div key={it.id} className="flex items-center gap-3 bg-white border border-stone-200 rounded-xl p-2">
                        <div className={`w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 ${catLight(it.category)}`}>
                          <Package size={18} />
                        </div>
                        <div className="flex-1">
                          <div className="text-sm font-medium text-stone-800">{it.name}</div>
                          <div className="text-xs text-stone-500">متوفر: {it.qty} · {Number(it.price).toLocaleString()} ل.س</div>
                        </div>
                        {inCart ? (
                          <div className="flex items-center gap-2 bg-stone-100 rounded-lg px-2 py-1">
                            <button onClick={() => changeQty(it.id, -1)}><Minus size={14} /></button>
                            <span className="text-sm font-medium w-4 text-center">{inCart.qty}</span>
                            <button onClick={() => changeQty(it.id, 1)}><Plus size={14} className="text-pink-600" /></button>
                          </div>
                        ) : (
                          <button onClick={() => addToCart(it.id)} aria-label={`أضف ${it.name}`}
                            className="w-8 h-8 rounded-full bg-pink-50 text-pink-700 flex items-center justify-center flex-shrink-0">
                            <Plus size={16} />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>

                {cartCount > 0 && (
                  <button onClick={() => setCheckout(true)}
                    className="fixed bottom-20 left-1/2 -translate-x-1/2 max-w-[280px] w-[85%] bg-pink-600 text-white rounded-xl py-3 flex items-center justify-center gap-2 text-sm font-medium shadow-lg">
                    <ShoppingCart size={16} /> السلة ({cartCount} صنف)
                  </button>
                )}
              </>
            )}

            {checkout && !orderDone && (
              <div>
                <button onClick={() => setCheckout(false)} className="flex items-center gap-1 text-sm text-stone-500 mb-3">
                  <ArrowRight size={16} /> رجوع
                </button>
                <div className="font-medium text-stone-800 mb-3">سلتي — {activeHouse.name}</div>
                <div className="flex flex-col gap-2 mb-4">
                  {cartLines.map((l) => (
                    <div key={l.id} className="flex items-center gap-3 bg-white border border-stone-200 rounded-xl p-2">
                      <div className="flex-1">
                        <div className="text-sm font-medium text-stone-800">{l.name}</div>
                        <div className="text-xs text-stone-500">{Number(l.price).toLocaleString()} ل.س</div>
                      </div>
                      <div className="flex items-center gap-2 bg-stone-100 rounded-lg px-2 py-1">
                        <button onClick={() => changeQty(l.id, -1)}><Minus size={14} /></button>
                        <span className="text-sm font-medium w-4 text-center">{l.qty}</span>
                        <button onClick={() => changeQty(l.id, 1)}><Plus size={14} className="text-pink-600" /></button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="text-xs text-stone-500 mb-1">عنوان التوصيل</div>
                <textarea value={address} onChange={(e) => setAddress(e.target.value)}
                  placeholder="الحي، الشارع، أقرب معلم..." rows={2}
                  className="w-full bg-white border border-stone-200 rounded-xl p-3 text-sm mb-3 outline-none placeholder-stone-400" />

                <div className="text-xs text-stone-500 mb-1">ملاحظة (اختياري)</div>
                <input value={note} onChange={(e) => setNote(e.target.value)}
                  placeholder="مثلاً: بدون بصل"
                  className="w-full bg-white border border-stone-200 rounded-xl p-3 text-sm mb-3 outline-none placeholder-stone-400" />

                <div className="bg-white border border-stone-200 rounded-xl p-3 text-sm mb-4 flex items-center gap-2 text-stone-600">
                  <span>طريقة الدفع:</span><span className="font-medium">كاش عند الاستلام</span>
                </div>

                <div className="flex justify-between text-sm text-stone-500 mb-1">
                  <span>المجموع</span><span>{cartTotal.toLocaleString()} ل.س</span>
                </div>
                <div className="flex justify-between text-sm text-stone-500 mb-2">
                  <span>التوصيل</span><span>{deliveryFee.toLocaleString()} ل.س</span>
                </div>
                <div className="flex justify-between font-medium text-stone-800 mb-4">
                  <span>الإجمالي</span><span>{(cartTotal + deliveryFee).toLocaleString()} ل.س</span>
                </div>

                {!address.trim() && (
                  <div className="text-xs text-red-600 mb-2">لازم تكتبي عنوان التوصيل قبل التأكيد.</div>
                )}
                <button onClick={confirmOrder}
                  className="w-full bg-pink-600 text-white rounded-xl py-3 font-medium text-sm">
                  تأكيد الطلب
                </button>
              </div>
            )}

            {orderDone && (
              <div className="text-center py-16">
                <div className="w-14 h-14 rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center mx-auto mb-3">
                  <Check size={26} />
                </div>
                <div className="font-medium text-stone-800 mb-1">تم إرسال طلبك!</div>
                <div className="text-sm text-stone-500 mb-5">بيت الطبخ رح يستلم طلبك ويجهزه.</div>
                <button onClick={() => { setActiveHouseId(null); setCheckout(false); setOrderDone(false); }}
                  className="text-sm text-pink-700 font-medium">رجوع للتصفح</button>
              </div>
            )}
          </div>
        )}

        {/* ---------------- REGISTER ---------------- */}
        {tab === "register" && (
          <div>
            {regDone ? (
              <div className="text-center py-16">
                <div className="w-14 h-14 rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center mx-auto mb-3">
                  <Check size={26} />
                </div>
                <div className="font-medium text-stone-800 mb-1">تم تسجيل بيت طبخك!</div>
                <div className="text-sm text-stone-500 mb-5">صار ظاهر هلق بصفحة التصفح.</div>
                <button onClick={() => { setRegDone(false); setTab("browse"); }}
                  className="text-sm text-pink-700 font-medium">شوفيه بالتصفح</button>
              </div>
            ) : (
              <div>
                <div className="font-medium text-stone-800 mb-4">سجّلي مطبخك</div>

                <div className="text-xs text-stone-500 mb-1">اسم بيت الطبخ</div>
                <input value={regName} onChange={(e) => setRegName(e.target.value)}
                  placeholder="مثال: مطبخ أم خالد"
                  className="w-full bg-white border border-stone-200 rounded-xl p-3 text-sm mb-3 outline-none placeholder-stone-400" />

                <div className="text-xs text-stone-500 mb-1">وصف قصير</div>
                <input value={regDesc} onChange={(e) => setRegDesc(e.target.value)}
                  placeholder="حكيلنا شوي عن اختصاصك"
                  className="w-full bg-white border border-stone-200 rounded-xl p-3 text-sm mb-3 outline-none placeholder-stone-400" />

                <div className="text-xs text-stone-500 mb-1">المنطقة / المدينة</div>
                <input value={regArea} onChange={(e) => setRegArea(e.target.value)}
                  placeholder="مثال: دمشق - المزة"
                  className="w-full bg-white border border-stone-200 rounded-xl p-3 text-sm mb-3 outline-none placeholder-stone-400" />

                <div className="text-xs text-stone-500 mb-1">رقم الهاتف</div>
                <input value={regPhone} onChange={(e) => setRegPhone(e.target.value)}
                  placeholder="09xxxxxxxx"
                  className="w-full bg-white border border-stone-200 rounded-xl p-3 text-sm mb-4 outline-none placeholder-stone-400" />

                <div className="text-xs text-stone-500 mb-2">شو اختصاصك؟ (اختاري وحدة أو أكتر)</div>
                <div className="flex flex-wrap gap-2 mb-5">
                  {CATS.map((c) => (
                    <button key={c.id} onClick={() => toggleRegCat(c.id)}
                      className={`text-xs px-3 py-1.5 rounded-full ${regCats.includes(c.id) ? "bg-amber-500 text-stone-950" : "bg-white border border-stone-200 text-stone-500"}`}>
                      {c.label}
                    </button>
                  ))}
                </div>

                <div className="text-xs text-stone-500 mb-2">أصنافك</div>
                <div className="flex flex-col gap-3 mb-3">
                  {regItems.map((it, idx) => (
                    <div key={idx} className="bg-white border border-stone-200 rounded-xl p-3 flex flex-col gap-2">
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-stone-400">صنف {idx + 1}</span>
                        {regItems.length > 1 && (
                          <button onClick={() => removeRegItemRow(idx)} className="text-stone-400"><Trash2 size={14} /></button>
                        )}
                      </div>
                      <input value={it.name} onChange={(e) => updateRegItem(idx, "name", e.target.value)}
                        placeholder="اسم الصنف (مثلاً: مكدوس)"
                        className="w-full bg-stone-50 border border-stone-200 rounded-lg p-2 text-sm outline-none placeholder-stone-400" />
                      <select value={it.category} onChange={(e) => updateRegItem(idx, "category", e.target.value)}
                        className="w-full bg-stone-50 border border-stone-200 rounded-lg p-2 text-sm outline-none">
                        <option value="">اختاري التصنيف</option>
                        {(regCats.length ? regCats : CATS.map((c) => c.id)).map((c) => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                      <div className="flex gap-2">
                        <input value={it.price} onChange={(e) => updateRegItem(idx, "price", e.target.value)}
                          type="number" placeholder="السعر (ل.س)"
                          className="w-1/2 bg-stone-50 border border-stone-200 rounded-lg p-2 text-sm outline-none placeholder-stone-400" />
                        <input value={it.qty} onChange={(e) => updateRegItem(idx, "qty", e.target.value)}
                          type="number" placeholder="الكمية"
                          className="w-1/2 bg-stone-50 border border-stone-200 rounded-lg p-2 text-sm outline-none placeholder-stone-400" />
                      </div>
                    </div>
                  ))}
                </div>
                <button onClick={addRegItemRow} className="text-sm text-pink-700 font-medium mb-4 flex items-center gap-1">
                  <Plus size={14} /> ضيفي صنف تاني
                </button>

                {regError && <div className="text-xs text-red-600 mb-3">{regError}</div>}

                <button onClick={submitRegistration} disabled={regSubmitting}
                  className="w-full bg-pink-600 text-white rounded-xl py-3 font-medium text-sm disabled:opacity-60">
                  {regSubmitting ? "عم نسجل..." : "سجّلي بيت الطبخ"}
                </button>
              </div>
            )}
          </div>
        )}

        {/* ---------------- ORDERS (house owner) ---------------- */}
        {tab === "orders" && (
          <div>
            <div className="font-medium text-stone-800 mb-3">طلبات بيت طبخي</div>
            <select value={ordersHouseId} onChange={(e) => setOrdersHouseId(e.target.value)}
              className="w-full bg-white border border-stone-200 rounded-xl p-3 text-sm mb-4 outline-none">
              <option value="">اختاري بيت طبخك</option>
              {houses.map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}
            </select>

            {ordersHouseId && myOrders.length === 0 && (
              <div className="text-center text-stone-400 text-sm py-16">
                <ClipboardList className="mx-auto mb-2" size={28} />
                ما في طلبات لهلق.
              </div>
            )}

            <div className="flex flex-col gap-3">
              {myOrders.map((o) => (
                <div key={o.id} className="bg-white border border-stone-200 rounded-2xl p-3">
                  <div className="flex justify-between items-center mb-2">
                    <span className={`text-xs px-2 py-1 rounded-full ${o.status === "تم التسليم" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
                      {o.status}
                    </span>
                    <span className="text-xs text-stone-400">{new Date(o.createdAt).toLocaleString("ar")}</span>
                  </div>
                  <div className="text-sm text-stone-700 mb-1">
                    {(o.items || []).map((l) => `${l.name} ×${l.qty}`).join("، ")}
                  </div>
                  <div className="text-xs text-stone-500 mb-1">العنوان: {o.address}</div>
                  {o.note && <div className="text-xs text-stone-500 mb-1">ملاحظة: {o.note}</div>}
                  <div className="text-sm font-medium text-stone-800 mb-2">{Number(o.total).toLocaleString()} ل.س</div>
                  <button onClick={() => toggleOrderStatus(o.id)}
                    className="text-xs text-pink-700 font-medium">
                    غيّري الحالة إلى {o.status === "قيد التحضير" ? "تم التسليم" : "قيد التحضير"}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* bottom nav */}
      <div className="flex border-t border-stone-200 bg-white">
        {[
          { id: "browse", label: "تصفح", icon: Home },
          { id: "register", label: "سجّلي مطبخك", icon: ChefHat },
          { id: "orders", label: "طلباتي", icon: ClipboardList },
        ].map((t) => (
          <button key={t.id} onClick={() => { setTab(t.id); setActiveHouseId(null); }}
            className={`flex-1 py-3 flex flex-col items-center gap-1 text-xs ${tab === t.id ? "text-pink-700" : "text-stone-400"}`}>
            <t.icon size={18} />
            {t.label}
          </button>
        ))}
      </div>
    </div>
  );
}
