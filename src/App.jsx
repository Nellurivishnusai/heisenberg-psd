import { useState, useMemo, useEffect } from "react";
import { supabase } from "./supabaseClient";
import { ShoppingBag, X, Plus, Minus, Check, ArrowRight, Sparkles } from "lucide-react";

const FONTS = `
@import url('https://fonts.googleapis.com/css2?family=Anton&family=Space+Mono:wght@400;700&family=Inter:wght@400;500;600;700&display=swap');
`;

const COLORS = {
  black: "#000000",
  white: "#FFFFFF",
  blue: "#6168FF",
  yellow: "#FFCC00",
};

// deterministic pseudo-random offsets per character index, so the
// shattered-letter look stays stable across renders
function shard(i) {
  const rot = ((i * 53) % 7) - 3; // -3..3 deg
  const ty = ((i * 29) % 5) - 2; // -2..2 px
  return { rot, ty };
}

function ShardWord({ text, fontSize, fg = COLORS.white, shadowA = COLORS.black, shadowB = COLORS.yellow, lineHeight = 0.95 }) {
  const lines = text.split("\n");
  return (
    <div style={{ lineHeight }}>
      {lines.map((line, li) => (
        <div key={li} style={{ display: "flex", flexWrap: "wrap" }}>
          {line.split("").map((ch, i) => {
            const { rot, ty } = shard(li * 100 + i);
            return (
              <span
                key={i}
                style={{
                  display: "inline-block",
                  fontFamily: "'Anton', sans-serif",
                  fontSize,
                  color: ch === " " ? "transparent" : fg,
                  transform: `rotate(${rot}deg) translateY(${ty}px)`,
                  textShadow: ch === " " ? "none" : `4px 5px 0 ${shadowA}, -3px 3px 0 ${shadowB}`,
                  marginRight: ch === " " ? "0.28em" : "-0.01em",
                  textTransform: "uppercase",
                }}
              >
                {ch}
              </span>
            );
          })}
        </div>
      ))}
    </div>
  );
}

const CATEGORIES = ["All", "Type", "Music", "Abstract"];

function PosterCard({ poster, onAdd, onSelect }) {
  const [hover, setHover] = useState(false);
  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onClick={() => onSelect(poster)}
      style={{
        position: "relative",
        transform: "rotate(0deg)",
        transition: "transform 0.25s ease",
        cursor: "pointer",
      }}
    >
      <div
        style={{
          background: poster.image ? "transparent" : poster.bg,
          aspectRatio: "3 / 4",
          borderRadius: 2,
          position: "relative",
          overflow: "hidden",
          boxShadow: hover ? "0 18px 30px rgba(0,0,0,0.35)" : "0 6px 14px rgba(0,0,0,0.25)",
          transition: "box-shadow 0.25s ease",
          border: `2px solid ${COLORS.black}`,
        }}
      >
        <div style={{ position: "absolute", top: -6, left: 14, width: 46, height: 18, background: "rgba(255,255,255,0.45)", transform: "rotate(-8deg)" }} />
        <div style={{ position: "absolute", top: -6, right: 14, width: 46, height: 18, background: "rgba(255,255,255,0.45)", transform: "rotate(8deg)" }} />

        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            flexDirection: "column",
            justifyContent: "flex-end",
            padding: "16px",
          }}
        >
          {poster.image && (
            <img
              src={poster.image}
              alt={poster.title}
              onError={(e) => {
                console.error("IMAGE FAILED TO LOAD");
                console.error("URL:", e.currentTarget.src);
              }}
              onLoad={() => {
                console.log("IMAGE LOADED:", poster.image);
              }}
              style={{
                position: "absolute",
                inset: 0,
                width: "100%",
                height: "100%",
                objectFit: "cover",
                zIndex: 0,
              }}
            />
          )}

          <div style={{ position: "relative", zIndex: 1 }}>
            <ShardWord
              text={poster.title}
              fontSize={poster.title.length > 8 ? 26 : 36}
              fg={poster.fg}
              shadowA={poster.shadowA}
              shadowB={poster.shadowB}
            />
            <div
              style={{
                fontFamily: "'Space Mono', monospace",
                fontSize: 11,
                color: poster.fg,
                opacity: 0.85,
                marginTop: 10,
              }}
            >
              {poster.sub}
            </div>
          </div>
        </div>

        <div
          style={{
            position: "absolute",
            top: 12,
            right: -8,
            background: COLORS.white,
            color: COLORS.black,
            fontFamily: "'Space Mono', monospace",
            fontSize: 12,
            fontWeight: 700,
            padding: "4px 10px",
            transform: "rotate(6deg)",
            border: `1.5px solid ${COLORS.black}`,
          }}
        >
          FROM ₹{Math.min(poster.priceA4, poster.price4x6)}
        </div>
      </div>

      <button
        onClick={(e) => {
          e.stopPropagation();
          onSelect(poster);
        }}
        style={{
          marginTop: 10,
          width: "100%",
          background: COLORS.yellow,
          color: COLORS.black,
          border: `1.5px solid ${COLORS.black}`,
          padding: "10px 12px",
          fontFamily: "'Space Mono', monospace",
          fontSize: 12,
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: "0.05em",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 6,
        }}
      >
        <ArrowRight size={14} /> View options
      </button>
    </div>
  );
}

function CartItemQtyInput({ item, onSetQty }) {
  const [draft, setDraft] = useState(String(item.qty));

  useEffect(() => {
    setDraft(String(item.qty));
  }, [item.qty]);

  function handleChange(e) {
    let clean = e.target.value.replace(/[^0-9]/g, "");
    if (clean.length > 1 && clean.startsWith("0")) {
      clean = clean.replace(/^0+/, "");
    }
    setDraft(clean);
    if (clean !== "") {
      const num = parseInt(clean, 10);
      if (num >= 1) {
        onSetQty(item.id, item.size, num);
      }
    }
  }

  function handleBlur() {
    const num = parseInt(draft, 10);
    if (!num || num < 1) {
      setDraft("1");
      onSetQty(item.id, item.size, 1);
    } else {
      setDraft(String(num));
      if (num !== item.qty) {
        onSetQty(item.id, item.size, num);
      }
    }
  }

  function handleKeyDown(e) {
    if (e.key === "Enter") {
      e.target.blur();
    }
  }

  return (
    <input
      type="text"
      inputMode="numeric"
      pattern="[0-9]*"
      value={draft}
      onChange={handleChange}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      style={{
        fontFamily: "'Space Mono', monospace",
        fontSize: 12,
        width: 36,
        textAlign: "center",
        border: `1.5px solid ${COLORS.black}`,
        padding: "4px 2px",
        outline: "none",
        background: COLORS.white,
        color: COLORS.black,
      }}
    />
  );
}

function CartDrawer({ open, onClose, cart, posters, onQty, onSetQty, onRemove, onCheckout }) {
  const items = cart
    .map((c) => ({ ...c, poster: posters.find((p) => p.id === c.id) }))
    .filter((c) => Boolean(c.poster));
  const subtotal = items.reduce((s, i) => s + i.price * i.qty, 0);

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        right: 0,
        height: "100%",
        width: "min(380px, 100vw)",
        background: COLORS.white,
        transform: open ? "translateX(0)" : "translateX(100%)",
        transition: "transform 0.3s ease",
        zIndex: 50,
        borderLeft: `3px dashed ${COLORS.black}`,
        display: "flex",
        flexDirection: "column",
        boxShadow: open ? "-10px 0 30px rgba(0,0,0,0.3)" : "none",
      }}
    >
      <div style={{ padding: "20px 20px 12px", borderBottom: `2px solid ${COLORS.black}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ fontFamily: "'Anton', sans-serif", fontSize: 22, color: COLORS.black, letterSpacing: "0.02em" }}>YOUR STASH</div>
        <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: COLORS.black }}>
          <X size={22} />
        </button>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "12px 20px" }}>
        {items.length === 0 && (
          <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 13, color: COLORS.black, opacity: 0.6, marginTop: 40, textAlign: "center" }}>
            Empty. Go tape something to your wall.
          </div>
        )}
        {items.map((item) => (
          <div key={`${item.id}-${item.size}`} style={{ display: "flex", gap: 12, padding: "12px 0", borderBottom: `1px dashed ${COLORS.black}`, alignItems: "center" }}>
            <div
              style={{
                width: 48,
                height: 64,
                background: item.poster.bg,
                border: `1.5px solid ${COLORS.black}`,
                flexShrink: 0,
                overflow: "hidden",
              }}
            >
              {item.poster.image ? (
                <img
                  src={item.poster.image}
                  alt={item.poster.title}
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    display: "block",
                  }}
                />
              ) : (
                <ShardWord
                  text={item.poster.title}
                  fontSize={14}
                  fg={item.poster.fg}
                  shadowA={item.poster.shadowA}
                  shadowB={item.poster.shadowB}
                />
              )}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: "'Anton', sans-serif", fontSize: 15, color: COLORS.black, textTransform: "uppercase" }}>
                {item.poster.title.replace("\n", " ")}
              </div>
              <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 11, color: COLORS.black, opacity: 0.7 }}>{item.size === "A4" ? "A4" : '4" × 6"'} · ₹{item.price} each</div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6 }}>
                <button
                  onClick={() => onQty(item.id, item.size, -1)}
                  style={{
                    border: `1px solid ${COLORS.black}`,
                    background: COLORS.white,
                    color: COLORS.black,
                    cursor: "pointer",
                    width: 32,
                    height: 32,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: 0,
                  }}
                >
                  <Minus size={16} color={COLORS.black} strokeWidth={2.5} />
                </button>
                <CartItemQtyInput item={item} onSetQty={onSetQty} />
                <button
                  onClick={() => onQty(item.id, item.size, 1)}
                  style={{
                    border: `1px solid ${COLORS.black}`,
                    background: COLORS.white,
                    color: COLORS.black,
                    cursor: "pointer",
                    width: 32,
                    height: 32,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: 0,
                  }}
                >
                  <Plus size={16} color={COLORS.black} strokeWidth={2.5} />
                </button>
              </div>
            </div>
            <div style={{ textAlign: "right", display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
              <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 13, fontWeight: 700, color: COLORS.black }}>
                ₹{(item.price * item.qty).toFixed(0)}
              </div>
              <button
                onClick={() => onRemove ? onRemove(item.id, item.size) : onQty(item.id, item.size, -item.qty)}
                style={{
                  background: "none",
                  border: "none",
                  color: "#888",
                  fontFamily: "'Space Mono', monospace",
                  fontSize: 10,
                  cursor: "pointer",
                  padding: "4px 0 0",
                  textDecoration: "underline",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.color = "#D00000"; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = "#888"; }}
              >
                REMOVE
              </button>
            </div>
          </div>
        ))}
      </div>

      <div style={{ padding: 20, borderTop: `2px solid ${COLORS.black}` }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontFamily: "'Space Mono', monospace", fontSize: 14, marginBottom: 14, color: COLORS.black }}>
          <span>SUBTOTAL</span>
          <span style={{ fontWeight: 700 }}>₹{subtotal.toFixed(0)}</span>
        </div>
        <button
          disabled={items.length === 0}
          onClick={onCheckout}
          style={{
            width: "100%",
            background: items.length === 0 ? "#999" : COLORS.blue,
            color: COLORS.white,
            border: "none",
            padding: "14px",
            fontFamily: "'Anton', sans-serif",
            fontSize: 16,
            letterSpacing: "0.03em",
            cursor: items.length === 0 ? "not-allowed" : "pointer",
            textTransform: "uppercase",
          }}
        >
          Checkout
        </button>
      </div>
    </div>
  );
}

function CheckoutModal({ open, onClose, subtotal, onConfirm, isSubmitting }) {
  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    address: "",
  });
  const [phoneError, setPhoneError] = useState("");
  const [emailError, setEmailError] = useState("");

  if (!open) return null;

  const isPhoneValid = /^[0-9]{10}$/.test(form.phone);
  const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim());

  const formIncomplete =
    !form.name.trim() || !form.phone || !form.email.trim() || !form.address.trim();

  const cannotSubmit = formIncomplete || !isPhoneValid || !isEmailValid || isSubmitting;

  function handlePhoneChange(e) {
    const raw = e.target.value;
    if (raw.includes("+") || (raw.startsWith("91") && raw.length > 10)) {
      setPhoneError("Enter 10-digit number only (no +91 or country codes)");
    } else if (/[^0-9]/.test(raw)) {
      setPhoneError("Only digits 0–9 allowed (no spaces, letters, or symbols)");
    } else if (raw.replace(/[^0-9]/g, "").length > 0 && raw.replace(/[^0-9]/g, "").length < 10) {
      setPhoneError("Phone number must be exactly 10 digits");
    } else {
      setPhoneError("");
    }
    const cleanDigits = raw.replace(/[^0-9]/g, "").slice(0, 10);
    setForm((prev) => ({ ...prev, phone: cleanDigits }));
  }

  function handleEmailChange(e) {
    const val = e.target.value;
    setForm((prev) => ({ ...prev, email: val }));
    if (val.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val.trim())) {
      setEmailError("Please enter a valid email address");
    } else {
      setEmailError("");
    }
  }

  function handleSubmit() {
    if (isSubmitting) return;

    if (!isPhoneValid) {
      setPhoneError("Phone number must be exactly 10 digits (0–9 only)");
      return;
    }
    if (!isEmailValid) {
      setEmailError("Please enter a valid email address");
      return;
    }
    if (formIncomplete) {
      return;
    }
    onConfirm(form);
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.75)",
        zIndex: 60,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: COLORS.white,
          width: "min(420px, 100%)",
          border: `3px solid ${COLORS.black}`,
          padding: 28,
          position: "relative",
        }}
      >
        <button
          onClick={onClose}
          style={{
            position: "absolute",
            top: 14,
            right: 14,
            background: "none",
            border: "none",
            cursor: "pointer",
            color: COLORS.black,
          }}
        >
          <X size={20} />
        </button>

        <div
          style={{
            fontFamily: "'Anton', sans-serif",
            fontSize: 28,
            color: COLORS.black,
            marginBottom: 4,
            textTransform: "uppercase",
          }}
        >
          Ship it
        </div>

        <div
          style={{
            fontFamily: "'Space Mono', monospace",
            fontSize: 12,
            color: COLORS.black,
            opacity: 0.7,
            marginBottom: 20,
          }}
        >
          Total: ₹{subtotal.toFixed(0)}
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 12,
          }}
        >
          <input
            placeholder="Full name"
            value={form.name}
            onChange={(e) =>
              setForm({ ...form, name: e.target.value })
            }
            style={inputStyle}
          />

          <div>
            <input
              type="tel"
              inputMode="numeric"
              placeholder="WhatsApp / Phone number (10 digits)"
              value={form.phone}
              onChange={handlePhoneChange}
              maxLength={10}
              style={{
                ...inputStyle,
                borderColor: phoneError ? "#D00000" : COLORS.black,
              }}
            />
            {phoneError && (
              <div
                style={{
                  fontFamily: "'Space Mono', monospace",
                  fontSize: 10,
                  color: "#D00000",
                  marginTop: 4,
                }}
              >
                {phoneError}
              </div>
            )}
          </div>

          <div>
            <input
              type="email"
              placeholder="Email"
              value={form.email}
              onChange={handleEmailChange}
              style={{
                ...inputStyle,
                borderColor: emailError ? "#D00000" : COLORS.black,
              }}
            />
            {emailError && (
              <div
                style={{
                  fontFamily: "'Space Mono', monospace",
                  fontSize: 10,
                  color: "#D00000",
                  marginTop: 4,
                }}
              >
                {emailError}
              </div>
            )}
          </div>

          <input
            placeholder="Shipping address"
            value={form.address}
            onChange={(e) =>
              setForm({ ...form, address: e.target.value })
            }
            style={inputStyle}
          />
        </div>

        <button
          onClick={handleSubmit}
          disabled={cannotSubmit}
          style={{
            marginTop: 20,
            width: "100%",
            background: cannotSubmit ? "#999" : COLORS.black,
            color: COLORS.white,
            border: "none",
            padding: "14px",
            fontFamily: "'Anton', sans-serif",
            fontSize: 16,
            letterSpacing: "0.03em",
            cursor: cannotSubmit ? "not-allowed" : "pointer",
            textTransform: "uppercase",
          }}
        >
          {isSubmitting ? "PROCESSING..." : "ORDER VIA WHATSAPP"}
        </button>

        <div
          style={{
            fontFamily: "'Space Mono', monospace",
            fontSize: 10,
            color: COLORS.black,
            opacity: 0.5,
            marginTop: 10,
            textAlign: "center",
          }}
        >
          You'll be redirected to WhatsApp to send your order.
        </div>
      </div>
    </div>
  );
}

function OrderConfirmation({ order, onClose }) {
  if (!order) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.8)",
        zIndex: 70,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
        animation: "confirmFadeIn 0.4s ease",
      }}
      onClick={onClose}
    >
      <style>{`
        @keyframes confirmFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes confirmSlideUp {
          from { opacity: 0; transform: translateY(30px) scale(0.96); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes confirmCheck {
          0% { transform: scale(0) rotate(-45deg); opacity: 0; }
          60% { transform: scale(1.2) rotate(0deg); opacity: 1; }
          100% { transform: scale(1) rotate(0deg); opacity: 1; }
        }
      `}</style>
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#15803d",
          width: "min(440px, 100%)",
          border: `3px solid ${COLORS.black}`,
          padding: 32,
          position: "relative",
          boxShadow: `10px 10px 0 ${COLORS.black}`,
          animation: "confirmSlideUp 0.5s ease",
        }}
      >
        {/* Checkmark circle */}
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: "50%",
            background: COLORS.white,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 20px",
            animation: "confirmCheck 0.6s ease 0.2s both",
          }}
        >
          <Check size={30} color="#15803d" strokeWidth={3} />
        </div>

        <div
          style={{
            fontFamily: "'Anton', sans-serif",
            fontSize: 30,
            color: COLORS.white,
            textAlign: "center",
            textTransform: "uppercase",
            letterSpacing: "0.03em",
            marginBottom: 6,
          }}
        >
          Thank you BOSS!!!
        </div>

        <div
          style={{
            fontFamily: "'Space Mono', monospace",
            fontSize: 11,
            color: "rgba(255,255,255,0.75)",
            textAlign: "center",
            marginBottom: 24,
          }}
        >
          Your order has been placed successfully.
        </div>

        {/* Order details card */}
        <div
          style={{
            background: "rgba(255,255,255,0.15)",
            border: "1px solid rgba(255,255,255,0.3)",
            padding: 20,
            marginBottom: 24,
          }}
        >
          <div
            style={{
              fontFamily: "'Space Mono', monospace",
              fontSize: 9,
              color: "rgba(255,255,255,0.7)",
              fontWeight: 700,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              marginBottom: 6,
            }}
          >
            ORDER NUMBER
          </div>
          <div
            style={{
              fontFamily: "'Anton', sans-serif",
              fontSize: 22,
              color: COLORS.white,
              marginBottom: 18,
            }}
          >
            {order.orderNumber}
          </div>

          {order.items.map((item, i) => (
            <div
              key={i}
              style={{
                borderTop: "1px solid rgba(255,255,255,0.2)",
                padding: "12px 0",
              }}
            >
              <div
                style={{
                  fontFamily: "'Anton', sans-serif",
                  fontSize: 16,
                  color: COLORS.white,
                  textTransform: "uppercase",
                  marginBottom: 6,
                }}
              >
                {item.title}
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontFamily: "'Space Mono', monospace",
                  fontSize: 11,
                  color: "rgba(255,255,255,0.85)",
                }}
              >
                <span>{item.size === "A4" ? "A4" : '4" × 6"'} · Qty {item.qty}</span>
                <span>₹{item.price} × {item.qty} = ₹{(item.price * item.qty).toFixed(0)}</span>
              </div>
            </div>
          ))}

          <div
            style={{
              borderTop: "2px solid rgba(255,255,255,0.4)",
              paddingTop: 12,
              marginTop: 4,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div
              style={{
                fontFamily: "'Space Mono', monospace",
                fontSize: 11,
                fontWeight: 700,
                color: COLORS.white,
                textTransform: "uppercase",
              }}
            >
              Total
            </div>
            <div
              style={{
                fontFamily: "'Anton', sans-serif",
                fontSize: 24,
                color: COLORS.white,
              }}
            >
              ₹{order.total}
            </div>
          </div>
        </div>

        <button
          onClick={onClose}
          style={{
            width: "100%",
            background: COLORS.white,
            color: "#15803d",
            border: "none",
            padding: "14px",
            fontFamily: "'Anton', sans-serif",
            fontSize: 16,
            letterSpacing: "0.03em",
            cursor: "pointer",
            textTransform: "uppercase",
          }}
        >
          CONTINUE SHOPPING
        </button>
      </div>
    </div>
  );
} 

const inputStyle = {
  padding: "10px 12px",
  border: `1.5px solid ${COLORS.black}`,
  background: "transparent",
  fontFamily: "'Inter', sans-serif",
  fontSize: 14,
  color: COLORS.black,
  outline: "none",
};

function Loader({ onDone }) {
  const word = "HEISENBRG.PSD";
  const [revealed, setRevealed] = useState(0);
  const [phase, setPhase] = useState("reveal"); // reveal -> expand -> done

  useEffect(() => {
    if (revealed < word.length) {
      const t = setTimeout(() => setRevealed((r) => r + 1), 110);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setPhase("expand"), 450);
    return () => clearTimeout(t);
  }, [revealed]);

  useEffect(() => {
    if (phase === "expand") {
      const t = setTimeout(() => {
        setPhase("done");
        onDone();
      }, 750);
      return () => clearTimeout(t);
    }
  }, [phase]);

  if (phase === "done") return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100,
        background: COLORS.blue,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        transition: "transform 0.75s cubic-bezier(.6,0,.4,1), opacity 0.75s ease",
        transform: phase === "expand" ? "scale(22)" : "scale(1)",
        opacity: phase === "expand" ? 0 : 1,
      }}
    >
      <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", maxWidth: 380 }}>
        {word.split("").map((ch, i) => {
          const { rot, ty } = shard(i);
          const visible = i < revealed;
          return (
            <span
              key={i}
              style={{
                display: "inline-block",
                fontFamily: "'Anton', sans-serif",
                fontSize: 46,
                color: COLORS.white,
                textShadow: `5px 6px 0 ${COLORS.black}, -3px 4px 0 ${COLORS.yellow}`,
                transform: visible ? `rotate(${rot}deg) translateY(${ty}px) scale(1)` : `rotate(${rot}deg) translateY(${ty - 24}px) scale(0.5)`,
                opacity: visible ? 1 : 0,
                transition: `opacity 0.3s ease ${i * 0.02}s, transform 0.3s ease ${i * 0.02}s`,
              }}
            >
              {ch}
            </span>
          );
        })}
      </div>
    </div>
  );
}

function CreatorLogin({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(e) {
    e.preventDefault();

    setLoading(true);
    setError("");

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    const { data: sessionData } = await supabase.auth.getSession();

    console.log("LOGIN RESULT:", {
      error,
      session: sessionData.session,
    });
    if (!error && sessionData.session) {
      onLogin(sessionData.session);
    }

    if (error) {
      setError(error.message);
    }

    setLoading(false);
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: COLORS.black,
        color: COLORS.white,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        fontFamily: "'Inter', sans-serif",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <style>{FONTS}</style>

      {/* Background graphic */}
      <div
        style={{
          position: "absolute",
          width: 520,
          height: 520,
          border: `2px solid ${COLORS.yellow}`,
          transform: "rotate(18deg)",
          opacity: 0.12,
          right: -180,
          top: -180,
        }}
      />

      <div
        style={{
          position: "absolute",
          width: 360,
          height: 360,
          border: `2px solid ${COLORS.blue}`,
          transform: "rotate(-12deg)",
          opacity: 0.12,
          left: -150,
          bottom: -140,
        }}
      />

      {/* Login card */}
      <div
        style={{
          width: "100%",
          maxWidth: 430,
          position: "relative",
          zIndex: 1,
        }}
      >
        <div
          style={{
            fontFamily: "'Space Mono', monospace",
            fontSize: 11,
            letterSpacing: "0.12em",
            color: COLORS.yellow,
            marginBottom: 18,
            textTransform: "uppercase",
          }}
        >
          HEISENBERG.PSD · CREATOR ACCESS
        </div>

        <ShardWord
          text={"CREATOR\nLOGIN"}
          fontSize={58}
          fg={COLORS.white}
          shadowA={COLORS.black}
          shadowB={COLORS.yellow}
        />

        <p
          style={{
            fontFamily: "'Space Mono', monospace",
            fontSize: 11,
            lineHeight: 1.7,
            color: "rgba(255,255,255,0.55)",
            margin: "22px 0 30px",
            maxWidth: 340,
          }}
        >
          PRIVATE AREA — MANAGE YOUR POSTERS, PRICES AND DROPS.
        </p>

        <form
          onSubmit={handleLogin}
          style={{
            background: COLORS.white,
            color: COLORS.black,
            padding: 28,
            border: `2px solid ${COLORS.yellow}`,
            boxShadow: `8px 8px 0 ${COLORS.yellow}`,
          }}
        >
          <label
            style={{
              display: "block",
              fontFamily: "'Space Mono', monospace",
              fontSize: 10,
              fontWeight: 700,
              marginBottom: 8,
              textTransform: "uppercase",
            }}
          >
            Email
          </label>

          <input
            type="email"
            placeholder="creator@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={{
              width: "100%",
              boxSizing: "border-box",
              padding: "13px 12px",
              border: `1.5px solid ${COLORS.black}`,
              outline: "none",
              fontFamily: "'Space Mono', monospace",
              fontSize: 13,
              marginBottom: 20,
            }}
          />

          <label
            style={{
              display: "block",
              fontFamily: "'Space Mono', monospace",
              fontSize: 10,
              fontWeight: 700,
              marginBottom: 8,
              textTransform: "uppercase",
            }}
          >
            Password
          </label>

          <input
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={{
              width: "100%",
              boxSizing: "border-box",
              padding: "13px 12px",
              border: `1.5px solid ${COLORS.black}`,
              outline: "none",
              fontFamily: "'Space Mono', monospace",
              fontSize: 13,
              marginBottom: 24,
            }}
          />

          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%",
              border: `2px solid ${COLORS.black}`,
              background: loading ? "#dddddd" : COLORS.yellow,
              color: COLORS.black,
              padding: "15px 18px",
              fontFamily: "'Anton', sans-serif",
              fontSize: 18,
              letterSpacing: "0.03em",
              cursor: loading ? "not-allowed" : "pointer",
              textTransform: "uppercase",
            }}
          >
            {loading ? "LOGGING IN..." : "ENTER STUDIO →"}
          </button>

          {error && (
            <div
              style={{
                marginTop: 18,
                padding: 12,
                background: "#FFE5E5",
                border: `1.5px solid ${COLORS.black}`,
                fontFamily: "'Space Mono', monospace",
                fontSize: 10,
                lineHeight: 1.5,
                color: "#B00000",
              }}
            >
              {error}
            </div>
          )}
        </form>

        <div
          style={{
            marginTop: 26,
            fontFamily: "'Space Mono', monospace",
            fontSize: 9,
            color: "rgba(255,255,255,0.35)",
            textTransform: "uppercase",
            letterSpacing: "0.08em",
          }}
        >
          /creator · private access
        </div>
      </div>
    </div>
  );
}

function CreatorPage() {
  const [session, setSession] = useState(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    async function getSession() {
      const { data } = await supabase.auth.getSession();

      setSession(data.session);
      setChecking(false);
    }

    getSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  if (checking) {
    return <div>Checking authentication...</div>;
  }

  if (!session) {
    return <CreatorLogin onLogin={setSession} />;
  }

  return <CreatorDashboard session={session} />;
}

const creatorLabelStyle = {
  display: "block",
  fontFamily: "'Space Mono', monospace",
  fontSize: 9,
  fontWeight: 700,
  letterSpacing: "0.08em",
  marginBottom: 8,
  textTransform: "uppercase",
};

const creatorInputStyle = {
  width: "100%",
  boxSizing: "border-box",
  padding: "13px 12px",
  background: "#FFFFFF",
  color: COLORS.black,
  border: `2px solid ${COLORS.black}`,
  outline: "none",
  fontFamily: "'Space Mono', monospace",
  fontSize: 11,
};

const miniLabelStyle = {
  fontFamily: "'Space Mono', monospace",
  fontSize: 8,
  fontWeight: 700,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
};

const priceStyle = {
  fontFamily: "'Anton', sans-serif",
  fontSize: 20,
  lineHeight: 1,
  marginTop: 4,
};

function CreatorDashboard({ session }) {
  const [posters, setPosters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [imageFile, setImageFile] = useState(null);
  const [editingPosterId, setEditingPosterId] = useState(null);

  const [orders, setOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [updatingOrderId, setUpdatingOrderId] = useState(null);

  const [newPoster, setNewPoster] = useState({
    title: "",
    description: "",
    category: "Type",
    image_url: "",
    price_a4: "",
    price_4x6: "",
    background_color: "",
    text_color: "",
    shadow_color_1: "",
    shadow_color_2: "",
  });

  useEffect(() => {
    async function loadPosters() {
      try {
        const { data, error } = await supabase
          .from("posters")
          .select("*")
          .order("id");

        if (error) {
          console.error("Error loading creator posters:", error);
          return;
        }

        setPosters(data || []);
      } catch (err) {
        console.error("Unexpected error loading creator posters:", err);
      } finally {
        setLoading(false);
      }
    }

    loadPosters();
  }, []);

  async function loadOrders() {
    setOrdersLoading(true);

    const { data, error } = await supabase
      .from("orders")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error loading orders:", error);
      setOrdersLoading(false);
      return;
    }

    console.log("Orders loaded from Supabase:", data);
    setOrders(data || []);
    setOrdersLoading(false);
  }

  useEffect(() => {
    loadOrders();
  }, []);

  async function handleOrderStatusChange(orderId, newStatus) {
    setUpdatingOrderId(orderId);

    const { data, error } = await supabase
      .from("orders")
      .update({
        status: newStatus,
      })
      .eq("id", orderId)
      .select()
      .single();

    if (error) {
      console.error("Error updating order status:", error);
      alert(error.message);
      setUpdatingOrderId(null);
      return;
    }

    console.log("Order status updated:", data);

    setOrders((prev) =>
      prev.map((order) =>
        order.id === orderId ? data : order
      )
    );

    setUpdatingOrderId(null);
  }
  async function handleAddPoster(e) {
    e.preventDefault();

    if (!imageFile) {
      alert("Please select a PNG poster.");
      return;
    }

    setSaving(true);

    const fileName = `${Date.now()}-${imageFile.name}`;

    // 1. Upload PNG to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from("Posters")
      .upload(fileName, imageFile, {
        contentType: "image/png",
        upsert: false,
      });

    if (uploadError) {
      console.error("Image upload error:", uploadError);
      alert(uploadError.message);
      setSaving(false);
      return;
    }

    // 2. Get the public URL of the uploaded PNG
    const {
      data: { publicUrl },
    } = supabase.storage
      .from("Posters")
      .getPublicUrl(fileName);

    // 3. Insert poster details into the database
    const { data, error } = await supabase
      .from("posters")
      .insert([
        {
          title: newPoster.title,
          description: newPoster.description,
          category: newPoster.category,
          image_url: publicUrl,
          price_a4: Number(newPoster.price_a4),
          price_4x6: Number(newPoster.price_4x6),
          background_color: newPoster.background_color,
          text_color: newPoster.text_color,
          shadow_color_1: newPoster.shadow_color_1,
          shadow_color_2: newPoster.shadow_color_2,
        },
      ])
      .select()
      .single();

    if (error) {
      console.error("Error adding poster:", error);
      alert(error.message);
      setSaving(false);
      return;
    }

    // 4. Add the new poster to the dashboard immediately
    setPosters((prev) => [...prev, data]);

    // 5. Reset the form
    setNewPoster({
      title: "",
      description: "",
      category: "Type",
      image_url: "",
      price_a4: "",
      price_4x6: "",
      background_color: "",
      text_color: "",
      shadow_color_1: "",
      shadow_color_2: "",
    });

    setImageFile(null);
    setShowAddForm(false);
    setSaving(false);
  }

  async function handleEditPoster(e) {
    e.preventDefault();

    if (!editingPosterId) return;

    setSaving(true);

    const { data, error } = await supabase
      .from("posters")
      .update({
        title: newPoster.title,
        description: newPoster.description,
        category: newPoster.category,
        price_a4: Number(newPoster.price_a4),
        price_4x6: Number(newPoster.price_4x6),
        background_color: newPoster.background_color,
        text_color: newPoster.text_color,
        shadow_color_1: newPoster.shadow_color_1,
        shadow_color_2: newPoster.shadow_color_2,
      })
      .eq("id", editingPosterId)
      .select()
      .single();

    if (error) {
      console.error("Error updating poster:", error);
      alert(error.message);
      setSaving(false);
      return;
    }

    // Update the poster in the dashboard immediately
    setPosters((prev) =>
      prev.map((poster) =>
        poster.id === editingPosterId ? data : poster
      )
    );

    // Reset edit state
    setNewPoster({
      title: "",
      description: "",
      category: "Type",
      image_url: "",
      price_a4: "",
      price_4x6: "",
      background_color: "",
      text_color: "",
      shadow_color_1: "",
      shadow_color_2: "",
    });

    setImageFile(null);
    setEditingPosterId(null);
    setShowAddForm(false);
    setSaving(false);
  }
  async function handleDeletePoster(poster) {
    const confirmed = window.confirm(
      `Are you sure you want to delete "${poster.title}"?`
    );

    if (!confirmed) return;

    setSaving(true);

    // 1. Get the file name from the poster's image URL
    const fileName = poster.image_url?.split("/").pop();

    // 2. Delete the image from Supabase Storage
    if (fileName) {
      const { error: imageDeleteError } = await supabase.storage
        .from("Posters")
        .remove([decodeURIComponent(fileName)]);

      if (imageDeleteError) {
        console.error("Error deleting poster image:", imageDeleteError);
        alert(imageDeleteError.message);
        setSaving(false);
        return;
      }
    }

    // 3. Delete the poster from the database
    const { error: deleteError } = await supabase
      .from("posters")
      .delete()
      .eq("id", poster.id);

    if (deleteError) {
      console.error("Error deleting poster:", deleteError);
      alert(deleteError.message);
      setSaving(false);
      return;
    }

    // 4. Remove it from the dashboard immediately
    setPosters((prev) =>
      prev.filter((item) => item.id !== poster.id)
    );

    setSaving(false);
  }
  function startEditingPoster(poster) {
    setEditingPosterId(poster.id);

    setNewPoster({
      title: poster.title || "",
      description: poster.description || "",
      category: poster.category || "Type",
      image_url: poster.image_url || "",
      price_a4: poster.price_a4 ?? "",
      price_4x6: poster.price_4x6 ?? "",
      background_color: poster.background_color || "",
      text_color: poster.text_color || "",
      shadow_color_1: poster.shadow_color_1 || "",
      shadow_color_2: poster.shadow_color_2 || "",
    });

    setImageFile(null);
    setShowAddForm(true);
  }
  async function handleLogout() {
    await supabase.auth.signOut();
  }
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#E9E9E4",
        color: COLORS.black,
        fontFamily: "'Inter', sans-serif",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <style>{FONTS}</style>

      {/* =========================
        DECORATIVE BACKGROUND
    ========================== */}

      <div
        style={{
          position: "fixed",
          width: 280,
          height: 280,
          background: COLORS.yellow,
          border: `3px solid ${COLORS.black}`,
          top: -150,
          right: -100,
          transform: "rotate(18deg)",
          zIndex: 0,
          pointerEvents: "none",
        }}
      />

      <div
        style={{
          position: "fixed",
          width: 180,
          height: 180,
          background: COLORS.blue,
          border: `3px solid ${COLORS.black}`,
          bottom: -100,
          left: -80,
          transform: "rotate(-25deg)",
          zIndex: 0,
          pointerEvents: "none",
        }}
      />

      <div
        style={{
          position: "fixed",
          width: 16,
          height: 16,
          background: COLORS.black,
          top: "28%",
          right: "6%",
          transform: "rotate(45deg)",
          zIndex: 0,
          pointerEvents: "none",
        }}
      />

      {/* =========================
        TOP NAV
    ========================== */}

      <header
        style={{
          position: "relative",
          zIndex: 2,
          background: COLORS.black,
          color: COLORS.white,
          borderBottom: `4px solid ${COLORS.yellow}`,
          minHeight: 70,
          padding: "0 28px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 20,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
          }}
        >
          <div
            style={{
              width: 12,
              height: 12,
              background: COLORS.yellow,
              transform: "rotate(45deg)",
              flexShrink: 0,
            }}
          />

          <div
            style={{
              fontFamily: "'Anton', sans-serif",
              fontSize: 25,
              letterSpacing: "0.03em",
            }}
          >
            HEISENBERG.PSD
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 22,
          }}
        >
          <div
            style={{
              fontFamily: "'Space Mono', monospace",
              fontSize: 9,
              letterSpacing: "0.1em",
              opacity: 0.55,
              textTransform: "uppercase",
            }}
          >
            CREATOR / STUDIO
          </div>

          <button
            onClick={handleLogout}
            style={{
              background: COLORS.white,
              color: COLORS.black,
              border: `2px solid ${COLORS.white}`,
              padding: "10px 15px",
              fontFamily: "'Space Mono', monospace",
              fontSize: 9,
              fontWeight: 700,
              cursor: "pointer",
              textTransform: "uppercase",
            }}
          >
            LOG OUT
          </button>
        </div>
      </header>

      {/* =========================
        MAIN CONTENT
    ========================== */}

      <main
        style={{
          position: "relative",
          zIndex: 1,
          maxWidth: 1450,
          margin: "0 auto",
          padding: "55px 28px 90px",
        }}
      >
        {/* HERO */}

        <section
          style={{
            display: "grid",
            gridTemplateColumns: "1fr auto",
            alignItems: "end",
            gap: 40,
            marginBottom: 55,
          }}
        >
          <div>
            <div
              style={{
                display: "inline-block",
                background: COLORS.black,
                color: COLORS.yellow,
                padding: "7px 10px",
                fontFamily: "'Space Mono', monospace",
                fontSize: 9,
                fontWeight: 700,
                letterSpacing: "0.1em",
                marginBottom: 16,
              }}
            >
              PRIVATE AREA · AUTHORIZED CREATOR
            </div>

            <ShardWord
              text="STUDIO"
              fontSize={78}
              fg={COLORS.black}
              shadowA={COLORS.white}
              shadowB={COLORS.yellow}
            />

            <div
              style={{
                marginTop: 16,
                fontFamily: "'Space Mono', monospace",
                fontSize: 10,
                color: "#555",
              }}
            >
              {session.user.email}
            </div>
          </div>

          {/* CATALOG COUNTER */}

          <div
            style={{
              background: COLORS.yellow,
              border: `3px solid ${COLORS.black}`,
              padding: "18px 22px",
              minWidth: 155,
              boxShadow: `8px 8px 0 ${COLORS.black}`,
              transform: "rotate(-2deg)",
            }}
          >
            <div
              style={{
                fontFamily: "'Space Mono', monospace",
                fontSize: 8,
                fontWeight: 700,
                letterSpacing: "0.1em",
                marginBottom: 7,
              }}
            >
              LIVE CATALOG
            </div>

            <div
              style={{
                fontFamily: "'Anton', sans-serif",
                fontSize: 52,
                lineHeight: 0.9,
              }}
            >
              {posters.length}
            </div>

            <div
              style={{
                fontFamily: "'Space Mono', monospace",
                fontSize: 8,
                fontWeight: 700,
                marginTop: 7,
              }}
            >
              POSTERS
            </div>
          </div>
        </section>

        {/* =========================
          CATALOG HEADER
      ========================== */}

        <section
          style={{
            borderTop: `3px solid ${COLORS.black}`,
            borderBottom: `3px solid ${COLORS.black}`,
            padding: "18px 0",
            marginBottom: 28,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 20,
            flexWrap: "wrap",
          }}
        >
          <div>
            <div
              style={{
                fontFamily: "'Anton', sans-serif",
                fontSize: 30,
                letterSpacing: "0.02em",
              }}
            >
              YOUR POSTERS
            </div>

            <div
              style={{
                fontFamily: "'Space Mono', monospace",
                fontSize: 9,
                color: "#666",
                marginTop: 4,
                letterSpacing: "0.04em",
              }}
            >
              MANAGE THE DESIGNS AVAILABLE IN THE SHOP
            </div>
          </div>

          <button
            onClick={() => setShowAddForm(true)}
            style={{
              background: COLORS.black,
              color: COLORS.yellow,
              border: `3px solid ${COLORS.black}`,
              padding: "14px 20px",
              boxShadow: `6px 6px 0 ${COLORS.yellow}`,
              fontFamily: "'Space Mono', monospace",
              fontSize: 10,
              fontWeight: 700,
              cursor: "pointer",
              textTransform: "uppercase",
            }}
          >
            + ADD POSTER
          </button>
        </section>

        {/* =========================
          ADD POSTER FORM
      ========================== */}

        {showAddForm && (
          <form
            onSubmit={editingPosterId ? handleEditPoster : handleAddPoster}
            style={{
              background: COLORS.white,
              border: `3px solid ${COLORS.black}`,
              boxShadow: `10px 10px 0 ${COLORS.blue}`,
              padding: 30,
              marginBottom: 42,
              position: "relative",
              zIndex: 10,
            }}
          >
            {/* FORM HEADER */}

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                gap: 20,
                marginBottom: 30,
              }}
            >
              <div>
                <div
                  style={{
                    fontFamily: "'Space Mono', monospace",
                    fontSize: 9,
                    color: COLORS.blue,
                    fontWeight: 700,
                    letterSpacing: "0.1em",
                  }}
                >
                  {editingPosterId ? "EDIT DROP" : "NEW DROP"}
                </div>

                <div
                  style={{
                    fontFamily: "'Anton', sans-serif",
                    fontSize: 30,
                    marginTop: 3,
                  }}
                >
                  {editingPosterId ? "EDIT POSTER" : "ADD POSTER"}
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                style={{
                  background: COLORS.white,
                  border: `2px solid ${COLORS.black}`,
                  padding: "8px 12px",
                  fontFamily: "'Space Mono', monospace",
                  fontSize: 9,
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                CLOSE ×
              </button>
            </div>

            {/* FORM FIELDS */}

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                gap: 20,
              }}
            >
              <div style={{ gridColumn: "1 / -1" }}>
                <label style={creatorLabelStyle}>
                  POSTER TITLE
                </label>

                <input
                  placeholder="e.g. MIDNIGHT CITY"
                  value={newPoster.title}
                  onChange={(e) =>
                    setNewPoster({
                      ...newPoster,
                      title: e.target.value,
                    })
                  }
                  required
                  style={creatorInputStyle}
                />
              </div>

              <div style={{ gridColumn: "1 / -1" }}>
                <label style={creatorLabelStyle}>
                  DESCRIPTION
                </label>

                <textarea
                  placeholder="Short description shown in the shop"
                  value={newPoster.description}
                  onChange={(e) =>
                    setNewPoster({
                      ...newPoster,
                      description: e.target.value,
                    })
                  }
                  required
                  rows={3}
                  style={{
                    ...creatorInputStyle,
                    resize: "vertical",
                    minHeight: 90,
                  }}
                />
              </div>

              <div>
                <label style={creatorLabelStyle}>
                  CATEGORY
                </label>

                <select
                  value={newPoster.category}
                  onChange={(e) =>
                    setNewPoster({
                      ...newPoster,
                      category: e.target.value,
                    })
                  }
                  style={creatorInputStyle}
                >
                  <option value="Type">Type</option>
                  <option value="Music">Music</option>
                  <option value="Abstract">Abstract</option>
                </select>
              </div>

              <div>
                <label style={creatorLabelStyle}>
                  POSTER PNG
                </label>

                <input
                  type="file"
                  accept="image/png"
                  onChange={(e) => {
                    setImageFile(e.target.files[0] || null);
                  }}
                  required={!editingPosterId}
                  style={{
                    ...creatorInputStyle,
                    padding: "9px",
                  }}
                />

                {imageFile && (
                  <div
                    style={{
                      marginTop: 7,
                      fontFamily: "'Space Mono', monospace",
                      fontSize: 8,
                      color: COLORS.blue,
                      wordBreak: "break-all",
                    }}
                  >
                    SELECTED → {imageFile.name}
                  </div>
                )}
              </div>

              <div>
                <label style={creatorLabelStyle}>
                  A4 PRICE · ₹
                </label>

                <input
                  type="number"
                  placeholder="399"
                  min="0"
                  value={newPoster.price_a4}
                  onChange={(e) =>
                    setNewPoster({
                      ...newPoster,
                      price_a4: e.target.value,
                    })
                  }
                  required
                  style={creatorInputStyle}
                />
              </div>

              <div>
                <label style={creatorLabelStyle}>
                  4 × 6 PRICE · ₹
                </label>

                <input
                  type="number"
                  placeholder="199"
                  min="0"
                  value={newPoster.price_4x6}
                  onChange={(e) =>
                    setNewPoster({
                      ...newPoster,
                      price_4x6: e.target.value,
                    })
                  }
                  required
                  style={creatorInputStyle}
                />
              </div>

              {/* COLOUR DATA */}

              <div
                style={{
                  gridColumn: "1 / -1",
                  marginTop: 8,
                  paddingTop: 22,
                  borderTop: `2px dashed ${COLORS.black}`,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    marginBottom: 16,
                  }}
                >
                  <div
                    style={{
                      width: 10,
                      height: 10,
                      background: COLORS.blue,
                      transform: "rotate(45deg)",
                    }}
                  />

                  <div
                    style={{
                      fontFamily: "'Space Mono', monospace",
                      fontSize: 9,
                      fontWeight: 700,
                      letterSpacing: "0.1em",
                    }}
                  >
                    POSTER COLOUR DATA
                  </div>
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns:
                      "repeat(auto-fit, minmax(170px, 1fr))",
                    gap: 14,
                  }}
                >
                  <div>
                    <label style={creatorLabelStyle}>
                      BACKGROUND
                    </label>

                    <input
                      placeholder="#FFFFFF"
                      value={newPoster.background_color}
                      onChange={(e) =>
                        setNewPoster({
                          ...newPoster,
                          background_color: e.target.value,
                        })
                      }
                      required
                      style={creatorInputStyle}
                    />
                  </div>

                  <div>
                    <label style={creatorLabelStyle}>
                      TEXT
                    </label>

                    <input
                      placeholder="#000000"
                      value={newPoster.text_color}
                      onChange={(e) =>
                        setNewPoster({
                          ...newPoster,
                          text_color: e.target.value,
                        })
                      }
                      required
                      style={creatorInputStyle}
                    />
                  </div>

                  <div>
                    <label style={creatorLabelStyle}>
                      SHADOW 1
                    </label>

                    <input
                      placeholder="#FFCC00"
                      value={newPoster.shadow_color_1}
                      onChange={(e) =>
                        setNewPoster({
                          ...newPoster,
                          shadow_color_1: e.target.value,
                        })
                      }
                      required
                      style={creatorInputStyle}
                    />
                  </div>

                  <div>
                    <label style={creatorLabelStyle}>
                      SHADOW 2
                    </label>

                    <input
                      placeholder="#6168FF"
                      value={newPoster.shadow_color_2}
                      onChange={(e) =>
                        setNewPoster({
                          ...newPoster,
                          shadow_color_2: e.target.value,
                        })
                      }
                      required
                      style={creatorInputStyle}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* FORM ACTIONS */}

            <div
              style={{
                marginTop: 28,
                paddingTop: 20,
                borderTop: `2px solid ${COLORS.black}`,
                display: "flex",
                gap: 12,
                flexWrap: "wrap",
              }}
            >
              <button
                type="submit"
                disabled={saving}
                style={{
                  background: saving ? "#CCC" : COLORS.yellow,
                  color: COLORS.black,
                  border: `3px solid ${COLORS.black}`,
                  padding: "14px 22px",
                  boxShadow: saving
                    ? "none"
                    : `5px 5px 0 ${COLORS.black}`,
                  fontFamily: "'Space Mono', monospace",
                  fontSize: 10,
                  fontWeight: 700,
                  cursor: saving ? "not-allowed" : "pointer",
                }}
              >
                {saving
                  ? editingPosterId
                    ? "UPDATING..."
                    : "UPLOADING..."
                  : editingPosterId
                    ? "UPDATE POSTER →"
                    : "PUBLISH POSTER →"}
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowAddForm(false);
                  setEditingPosterId(null);
                  setImageFile(null);
                }}
                style={{
                  background: COLORS.white,
                  color: COLORS.black,
                  border: `2px solid ${COLORS.black}`,
                  padding: "14px 22px",
                  fontFamily: "'Space Mono', monospace",
                  fontSize: 10,
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                CANCEL
              </button>
            </div>
          </form>
        )}

        {/* =========================
          POSTER GRID
      ========================== */}

        {loading ? (
          <div
            style={{
              background: COLORS.black,
              color: COLORS.yellow,
              border: `3px solid ${COLORS.black}`,
              padding: 30,
              fontFamily: "'Space Mono', monospace",
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: "0.08em",
            }}
          >
            LOADING CATALOG...
          </div>
        ) : posters.length === 0 ? (
          <div
            style={{
              background: COLORS.white,
              border: `3px dashed ${COLORS.black}`,
              padding: 70,
              textAlign: "center",
            }}
          >
            <div
              style={{
                fontFamily: "'Anton', sans-serif",
                fontSize: 38,
              }}
            >
              NO POSTERS YET.
            </div>

            <div
              style={{
                fontFamily: "'Space Mono', monospace",
                fontSize: 9,
                color: "#666",
                marginTop: 10,
              }}
            >
              YOUR FIRST DROP IS WAITING.
            </div>
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fill, minmax(300px, 1fr))",
              gap: 28,
            }}
          >
            {posters.map((poster, index) => (
              <div
                key={poster.id}
                style={{
                  background: COLORS.white,
                  border: `3px solid ${COLORS.black}`,
                  boxShadow: `8px 8px 0 ${poster.background_color || COLORS.yellow
                    }`,
                  overflow: "hidden",
                  position: "relative",
                }}
              >
                {/* POSTER IMAGE */}

                <div
                  style={{
                    height: 340,
                    background:
                      poster.background_color || COLORS.white,
                    borderBottom: `3px solid ${COLORS.black}`,
                    position: "relative",
                    overflow: "hidden",
                  }}
                >
                  {poster.image_url ? (
                    <img
                      src={poster.image_url}
                      alt={poster.title}
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "contain",
                        display: "block",
                      }}
                    />
                  ) : (
                    <div
                      style={{
                        height: "100%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <ShardWord
                        text={poster.title}
                        fontSize={34}
                        fg={poster.text_color}
                        shadowA={poster.shadow_color_1}
                        shadowB={poster.shadow_color_2}
                      />
                    </div>
                  )}

                  {/* NUMBER */}

                  <div
                    style={{
                      position: "absolute",
                      top: 12,
                      left: 12,
                      background: COLORS.black,
                      color: COLORS.yellow,
                      padding: "6px 9px",
                      fontFamily: "'Space Mono', monospace",
                      fontSize: 9,
                      fontWeight: 700,
                    }}
                  >
                    #{String(index + 1).padStart(2, "0")}
                  </div>

                  {/* CATEGORY */}

                  <div
                    style={{
                      position: "absolute",
                      bottom: 12,
                      right: 12,
                      background: COLORS.white,
                      color: COLORS.black,
                      border: `2px solid ${COLORS.black}`,
                      padding: "6px 9px",
                      fontFamily: "'Space Mono', monospace",
                      fontSize: 8,
                      fontWeight: 700,
                      textTransform: "uppercase",
                    }}
                  >
                    {poster.category}
                  </div>
                </div>

                {/* INFO */}

                <div style={{ padding: 20 }}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      gap: 15,
                    }}
                  >
                    <div>
                      <div
                        style={{
                          fontFamily: "'Anton', sans-serif",
                          fontSize: 25,
                          lineHeight: 1,
                          textTransform: "uppercase",
                        }}
                      >
                        {poster.title}
                      </div>

                      <div
                        style={{
                          fontFamily: "'Space Mono', monospace",
                          fontSize: 8,
                          color: COLORS.blue,
                          fontWeight: 700,
                          marginTop: 8,
                          textTransform: "uppercase",
                        }}
                      >
                        {poster.category}
                      </div>
                    </div>

                    <div
                      style={{
                        width: 12,
                        height: 12,
                        background:
                          poster.background_color || COLORS.yellow,
                        border: `2px solid ${COLORS.black}`,
                        flexShrink: 0,
                      }}
                    />
                  </div>

                  <p
                    style={{
                      fontFamily: "'Inter', sans-serif",
                      fontSize: 11,
                      lineHeight: 1.55,
                      color: "#555",
                      margin: "15px 0 18px",
                    }}
                  >
                    {poster.description}
                  </p>

                  {/* PRICES */}

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      borderTop: `2px solid ${COLORS.black}`,
                      borderBottom: `2px solid ${COLORS.black}`,
                      marginBottom: 16,
                    }}
                  >
                    <div
                      style={{
                        padding: "12px 8px",
                        borderRight: `1px dashed ${COLORS.black}`,
                      }}
                    >
                      <div style={miniLabelStyle}>A4</div>

                      <div style={priceStyle}>
                        ₹{poster.price_a4}
                      </div>
                    </div>

                    <div style={{ padding: "12px 8px" }}>
                      <div style={miniLabelStyle}>4 × 6</div>

                      <div style={priceStyle}>
                        ₹{poster.price_4x6}
                      </div>
                    </div>
                  </div>

                  {/* COLOUR DATA */}

                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 7,
                      marginBottom: 18,
                    }}
                  >
                    <div style={miniLabelStyle}>
                      COLOURS
                    </div>

                    {[
                      poster.background_color,
                      poster.text_color,
                      poster.shadow_color_1,
                      poster.shadow_color_2,
                    ].map((color, colorIndex) => (
                      <div
                        key={colorIndex}
                        title={color}
                        style={{
                          width: 18,
                          height: 18,
                          background: color || "#FFFFFF",
                          border: `2px solid ${COLORS.black}`,
                        }}
                      />
                    ))}
                  </div>

                  {/* ACTIONS
                    FUNCTIONALITY INTENTIONALLY UNCHANGED
                */}

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: 8,
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        startEditingPoster(poster);
                      }}
                      style={{
                        background: COLORS.white,
                        color: COLORS.black,
                        border: `2px solid ${COLORS.black}`,
                        padding: "11px",
                        fontFamily: "'Space Mono', monospace",
                        fontSize: 9,
                        fontWeight: 700,
                        cursor: "pointer",
                      }}
                    >
                      EDIT
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDeletePoster(poster)}
                      style={{
                        background: COLORS.black,
                        color: COLORS.white,
                        border: `2px solid ${COLORS.black}`,
                        padding: "11px",
                        fontFamily: "'Space Mono', monospace",
                        fontSize: 9,
                        fontWeight: 700,
                        cursor: "pointer",
                      }}
                    >
                      DELETE
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* =========================
          ORDERS
        ========================= */}

        <section
          style={{
            marginTop: 70,
            borderTop: `3px solid ${COLORS.black}`,
            paddingTop: 28,
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-end",
              gap: 20,
              flexWrap: "wrap",
              marginBottom: 28,
            }}
          >
            <div>
              <div
                style={{
                  fontFamily: "'Anton', sans-serif",
                  fontSize: 30,
                  letterSpacing: "0.02em",
                }}
              >
                ORDERS
              </div>

              <div
                style={{
                  fontFamily: "'Space Mono', monospace",
                  fontSize: 9,
                  color: "#666",
                  marginTop: 4,
                  letterSpacing: "0.04em",
                }}
              >
                MANAGE CUSTOMER ORDERS AND THEIR STATUS
              </div>
            </div>

            <button
              type="button"
              onClick={loadOrders}
              disabled={ordersLoading}
              style={{
                background: COLORS.black,
                color: COLORS.yellow,
                border: `3px solid ${COLORS.black}`,
                padding: "12px 18px",
                boxShadow: `5px 5px 0 ${COLORS.yellow}`,
                fontFamily: "'Space Mono', monospace",
                fontSize: 9,
                fontWeight: 700,
                cursor: ordersLoading ? "not-allowed" : "pointer",
                textTransform: "uppercase",
              }}
            >
              {ordersLoading ? "LOADING..." : "↻ REFRESH ORDERS"}
            </button>
          </div>

          {ordersLoading ? (
            <div
              style={{
                background: COLORS.black,
                color: COLORS.yellow,
                border: `3px solid ${COLORS.black}`,
                padding: 30,
                fontFamily: "'Space Mono', monospace",
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: "0.08em",
              }}
            >
              LOADING ORDERS...
            </div>
          ) : orders.length === 0 ? (
            <div
              style={{
                background: COLORS.white,
                border: `3px dashed ${COLORS.black}`,
                padding: 60,
                textAlign: "center",
              }}
            >
              <div
                style={{
                  fontFamily: "'Anton', sans-serif",
                  fontSize: 34,
                }}
              >
                NO ORDERS YET.
              </div>

              <div
                style={{
                  fontFamily: "'Space Mono', monospace",
                  fontSize: 9,
                  color: "#666",
                  marginTop: 10,
                }}
              >
                CUSTOMER ORDERS WILL APPEAR HERE.
              </div>
            </div>
          ) : (
            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fit, minmax(320px, 1fr))",
                gap: 24,
              }}
            >
              {orders.map((order) => (
                <div
                  key={order.id}
                  style={{
                    background: COLORS.white,
                    border: `3px solid ${COLORS.black}`,
                    boxShadow: `7px 7px 0 ${COLORS.yellow}`,
                    padding: 22,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      gap: 15,
                      marginBottom: 18,
                    }}
                  >
                    <div>
                      <div
                        style={{
                          fontFamily: "'Space Mono', monospace",
                          fontSize: 9,
                          color: COLORS.blue,
                          fontWeight: 700,
                          letterSpacing: "0.08em",
                        }}
                      >
                        ORDER
                      </div>

                      <div
                        style={{
                          fontFamily: "'Anton', sans-serif",
                          fontSize: 25,
                          marginTop: 3,
                        }}
                      >
                        {order.order_number}
                      </div>
                    </div>

                    <div
                      style={{
                        fontFamily: "'Space Mono', monospace",
                        fontSize: 9,
                        color: "#666",
                        textAlign: "right",
                      }}
                    >
                      {new Date(order.created_at).toLocaleDateString()}
                      <br />
                      {new Date(order.created_at).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </div>
                  </div>

                  <div
                    style={{
                      borderTop: `2px solid ${COLORS.black}`,
                      paddingTop: 16,
                      marginBottom: 18,
                    }}
                  >
                    <div style={creatorLabelStyle}>CUSTOMER</div>

                    <div
                      style={{
                        fontFamily: "'Inter', sans-serif",
                        fontSize: 14,
                        fontWeight: 700,
                        marginTop: 6,
                      }}
                    >
                      {order.customer_name}
                    </div>

                    <div
                      style={{
                        fontFamily: "'Space Mono', monospace",
                        fontSize: 10,
                        color: "#555",
                        marginTop: 5,
                        lineHeight: 1.6,
                      }}
                    >
                      {order.customer_phone}
                      <br />
                      {order.customer_email}
                    </div>
                  </div>

                  <div style={{ marginBottom: 18 }}>
                    <div style={creatorLabelStyle}>
                      SHIPPING ADDRESS
                    </div>

                    <div
                      style={{
                        fontFamily: "'Inter', sans-serif",
                        fontSize: 11,
                        lineHeight: 1.5,
                        color: "#555",
                        marginTop: 6,
                      }}
                    >
                      {order.shipping_address}
                    </div>
                  </div>

                  <div style={{ marginBottom: 18 }}>
                    <div style={creatorLabelStyle}>ORDER ITEMS</div>

                    <div
                      style={{
                        marginTop: 8,
                        borderTop: `1px dashed ${COLORS.black}`,
                      }}
                    >
                      {(Array.isArray(order.items)
                        ? order.items
                        : []
                      ).map((item, itemIndex) => (
                        <div
                          key={itemIndex}
                          style={{
                            padding: "9px 0",
                            borderBottom: `1px dashed ${COLORS.black}`,
                            fontFamily: "'Space Mono', monospace",
                            fontSize: 9,
                            lineHeight: 1.5,
                          }}
                        >
                          <strong>{item.title}</strong>
                          <br />
                          {item.size} × {item.qty} — ₹
                          {(item.price * item.qty).toFixed(0)}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      borderTop: `3px solid ${COLORS.black}`,
                      paddingTop: 14,
                      marginBottom: 16,
                    }}
                  >
                    <div
                      style={{
                        fontFamily: "'Space Mono', monospace",
                        fontSize: 10,
                        fontWeight: 700,
                      }}
                    >
                      TOTAL
                    </div>

                    <div
                      style={{
                        fontFamily: "'Anton', sans-serif",
                        fontSize: 26,
                      }}
                    >
                      ₹{Number(order.total).toFixed(0)}
                    </div>
                  </div>

                  <div>
                    <label style={creatorLabelStyle}>
                      ORDER STATUS
                    </label>

                    <select
                      value={order.status}
                      disabled={updatingOrderId === order.id}
                      onChange={(e) =>
                        handleOrderStatusChange(
                          order.id,
                          e.target.value
                        )
                      }
                      style={{
                        ...creatorInputStyle,
                        marginTop: 6,
                        fontWeight: 700,
                        textTransform: "uppercase",
                      }}
                    >
                      <option value="new">NEW</option>
                      <option value="confirmed">CONFIRMED</option>
                      <option value="processing">PROCESSING</option>
                      <option value="completed">COMPLETED</option>
                      <option value="cancelled">CANCELLED</option>
                    </select>

                    {updatingOrderId === order.id && (
                      <div
                        style={{
                          fontFamily: "'Space Mono', monospace",
                          fontSize: 8,
                          color: COLORS.blue,
                          marginTop: 6,
                        }}
                      >
                        UPDATING STATUS...
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>

      {/* =========================
        FOOTER
    ========================== */}
      <footer
        style={{
          position: "relative",
          zIndex: 2,
          borderTop: `3px solid ${COLORS.black}`,
          background: COLORS.yellow,
          padding: "13px 24px",
          fontFamily: "'Space Mono', monospace",
          fontSize: 8,
          fontWeight: 700,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          textAlign: "center",
        }}
      >
        HEISENBERG.PSD · CREATOR STUDIO · PRIVATE ACCESS
      </footer>
    </div>
  );
}

function PosterShop() {
  const [cart, setCart] = useState([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [confirmedOrder, setConfirmedOrder] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [filter, setFilter] = useState("All");
  const [loading, setLoading] = useState(true);
  const [selectedPoster, setSelectedPoster] = useState(null);
  const [selectedSize, setSelectedSize] = useState("A4");
  const [dbPosters, setDbPosters] = useState([]);
  useEffect(() => {
    async function loadPosters() {
      const { data, error } = await supabase
        .from("posters")
        .select("*")
        .order("id");

      if (error) {
        console.error("Error loading posters:", error);
        return;
      }

      console.log("Posters loaded from Supabase:", data);
      setDbPosters(data);
    }

    loadPosters();
  }, []);
  const posters = useMemo(() => {
    return dbPosters.map((poster) => ({
      id: poster.id,
      title: poster.title.toUpperCase(),
      sub: poster.description,
      image: poster.image_url,

      bg: poster.background_color,
      fg: poster.text_color,
      shadowA: poster.shadow_color_1,
      shadowB: poster.shadow_color_2,
      priceA4: poster.price_a4,
      price4x6: poster.price_4x6,

      tag: poster.category,
    }));
  }, [dbPosters]);
  const filtered = useMemo(
    () =>
      filter === "All"
        ? posters
        : posters.filter((p) => p.tag === filter),
    [filter, posters]
  );

  const totalCount = cart.reduce((s, c) => s + c.qty, 0);

  const subtotal = cart.reduce(
    (s, c) => s + c.price * c.qty,
    0
  );

  function addToCart(poster, size = "A4") {
    const price =
      size === "A4"
        ? poster.priceA4
        : poster.price4x6;

    setCart((prev) => {
      const existing = prev.find(
        (c) => c.id === poster.id && c.size === size
      );

      if (existing) {
        return prev.map((c) =>
          c.id === poster.id && c.size === size
            ? { ...c, qty: c.qty + 1 }
            : c
        );
      }

      return [...prev, { id: poster.id, size, price, qty: 1 }];
    });

    setCartOpen(true);
  }

  function changeQty(id, size, delta) {
    setCart((prev) =>
      prev
        .map((c) =>
          c.id === id && c.size === size ? { ...c, qty: c.qty + delta } : c
        )
        .filter((c) => c.qty > 0)
    );
  }

  function setQty(id, size, qty) {
    setCart((prev) =>
      prev.map((c) =>
        c.id === id && c.size === size ? { ...c, qty } : c
      )
    );
  }

  function removeFromCart(id, size) {
    setCart((prev) => prev.filter((c) => !(c.id === id && c.size === size)));
  }

  async function handleWhatsAppOrder(form) {
    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      const items = cart
        .map((c) => {
          const poster = posters.find((p) => p.id === c.id);

          if (!poster) return null;

          return {
            title: poster.title,
            size: c.size,
            qty: c.qty,
            price: c.price,
          };
        })
        .filter(Boolean);

      // Generate a unique order number
      const orderNumber = `HPSD-${new Date().getFullYear()}-${Date.now()
        .toString()
        .slice(-6)}`;

      // Save order to Supabase
      const { error } = await supabase.from("orders").insert([
        {
          order_number: orderNumber,
          customer_name: form.name.trim(),
          customer_phone: form.phone.trim(),
          customer_email: form.email.trim(),
          shipping_address: form.address.trim(),
          items: items,
          total: subtotal,
          status: "new",
        },
      ]);

      // If saving fails, do NOT open WhatsApp
      if (error) {
        console.error("Error creating order:", error);
        alert("Could not create your order. Please try again.");
        setIsSubmitting(false);
        return;
      }

      console.log("Order created successfully:", orderNumber);

      const orderLines = items
        .map(
          (item) =>
            `• ${item.title} — ${item.size} × ${item.qty} — ₹${(
              item.price * item.qty
            ).toFixed(0)}`
        )
        .join("\n");

      const message = [
        "Hello! I would like to place an order from HEISENBERG.PSD.",
        "",
        `ORDER NUMBER: ${orderNumber}`,
        "",
        "ORDER:",
        orderLines,
        "",
        `TOTAL: ₹${subtotal.toFixed(0)}`,
        "",
        "CUSTOMER DETAILS:",
        `Name: ${form.name.trim()}`,
        `Phone: ${form.phone.trim()}`,
        `Email: ${form.email.trim()}`,
        `Address: ${form.address.trim()}`,
        "",
        "Please confirm my order. Thank you!",
      ].join("\n");

      const whatsappUrl =
        `https://wa.me/917671906173?text=${encodeURIComponent(message)}`;

      window.open(whatsappUrl, "_blank", "noopener,noreferrer");

      // Show confirmation UI with order details
      setConfirmedOrder({
        orderNumber,
        items,
        total: subtotal.toFixed(0),
      });

      setCheckoutOpen(false);
      setCart([]);
    } catch (err) {
      console.error("Unexpected error creating order:", err);
      alert("Could not create your order. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  function closeCheckout() {
    setCheckoutOpen(false);
  }

  return (
    <div style={{ background: COLORS.white, minHeight: "100vh", fontFamily: "'Inter', sans-serif", position: "relative" }}>
      <style>{FONTS}</style>

      {loading && <Loader onDone={() => setLoading(false)} />}

      <div style={{ background: COLORS.yellow, overflow: "hidden", padding: "6px 0", borderBottom: `2px solid ${COLORS.black}` }}>
        <div style={{ display: "inline-block", whiteSpace: "nowrap", fontFamily: "'Space Mono', monospace", fontSize: 12, fontWeight: 700, color: COLORS.black, animation: "scroll 18s linear infinite" }}>
          {Array(6).fill("NEW DROP — LIMITED PRINTS — FIND YOUR DESIGN — ").join("")}
        </div>
        <style>{`@keyframes scroll { from { transform: translateX(0); } to { transform: translateX(-50%); } }`}</style>
      </div>

      <div
        style={{
          width: "100%",
          background: COLORS.blue,
        }}
      >
        <div
          style={{
            maxWidth: 1400,
            margin: "0 auto",
            padding: "14px 32px",
            display: "grid",
            gridTemplateColumns: "1fr auto 1fr",
            alignItems: "center",
          }}
        >
          {/* LEFT */}
          <div
            style={{
              fontFamily: "'Anton', sans-serif",
              fontSize: 24,
              color: COLORS.black,
              letterSpacing: "0.02em",
              textTransform: "uppercase",
            }}
          >
            Heisenbrg.psd
          </div>

          {/* CENTER */}
          <nav
            style={{
              display: "flex",
              justifyContent: "center",
              gap: 32,
              fontFamily: "'Space Mono', monospace",
              fontSize: 13,
              fontWeight: 700,
            }}
          >
            <a
              href="#shop"
              style={{
                color: COLORS.black,
                textDecoration: "none",
                borderBottom: `3px solid ${COLORS.black}`,
                paddingBottom: 4,
                transition: "transform 0.2s ease",
                display: "inline-block",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "scale(1.08)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "scale(1)";
              }}
            >
              SHOP
            </a>
            <a
              href="#about"
              style={{
                color: COLORS.black,
                textDecoration: "none",
                transition: "transform 0.2s ease",
                display: "inline-block",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "scale(1.08)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "scale(1)";
              }}
            >
              ABOUT
            </a>
          </nav>

          {/* RIGHT */}
          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
            }}
          >
            <button
              onClick={() => setCartOpen(true)}
              style={{
                position: "relative",
                background: COLORS.black,
                border: "none",
                padding: "8px 14px",
                display: "flex",
                alignItems: "center",
                gap: 8,
                color: COLORS.white,
                cursor: "pointer",
                fontFamily: "'Space Mono', monospace",
                fontSize: 12,
              }}
            >
              <ShoppingBag size={16} />
              CART

              {totalCount > 0 && (
                <span
                  style={{
                    position: "absolute",
                    top: -8,
                    right: -8,
                    background: COLORS.yellow,
                    color: COLORS.black,
                    borderRadius: "50%",
                    width: 20,
                    height: 20,
                    fontSize: 11,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: 700,
                  }}
                >
                  {totalCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "60px 32px 40px", display: "grid", gridTemplateColumns: "1.1fr 0.9fr", gap: 40, alignItems: "center" }}>
        <div>
          <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 12, color: COLORS.yellow, marginBottom: 14, display: "flex", alignItems: "center", gap: 8 }}>
            <Sparkles size={14} /> HAND-PRINTED · LIMITED RUNS
          </div>
          <ShardWord text="BROWSE THE CINEMATICS" fontSize={56} fg={COLORS.black} shadowA={COLORS.white} shadowB={COLORS.yellow} />
          <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 16, color: "rgba(0,0,0,0.75)", marginTop: 20, maxWidth: 440, lineHeight: 1.6 }}>
            Original graphic prints, riso-run posters and gig art — designed, printed, and shipped in small batches so your wall never looks like everyone else's.
          </p>
          <a
            href="#shop"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              marginTop: 26,
              background: COLORS.yellow,
              color: COLORS.black,
              padding: "14px 24px",
              fontFamily: "'Anton', sans-serif",
              fontSize: 16,
              textTransform: "uppercase",
              textDecoration: "none",
              letterSpacing: "0.02em",
            }}
          >
            Browse the drop <ArrowRight size={18} />
          </a>
        </div>

        <div style={{ position: "relative", height: 340 }}>
          {posters
            .filter((p) => p.image)
            .slice(0, 3)
            .map((p, i) => (
              <div
                key={p.id}
                style={{
                  position: "absolute",
                  width: 160,
                  aspectRatio: "3/4",
                  left: i * 70,
                  top: i % 2 === 0 ? 0 : 30,
                  border: `2px solid ${COLORS.white}`,
                  transform: `rotate(${p.rotate * 1.5}deg)`,
                  overflow: "hidden",
                  zIndex: i,
                }}
              >
                <img
                  src={p.image}
                  alt={p.title}
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    display: "block",
                  }}
                />
              </div>
            ))}
        </div>
      </div>
      {selectedPoster ? (
        <div
          style={{
            background: COLORS.white,
            minHeight: "70vh",
            padding: "60px 32px 80px",
          }}
        >
          <div
            style={{
              maxWidth: 1100,
              margin: "0 auto",
            }}
          >
            {/* BACK */}
            <button
              onClick={() => setSelectedPoster(null)}
              style={{
                background: "none",
                border: "none",
                padding: 0,
                display: "flex",
                alignItems: "center",
                gap: 8,
                fontFamily: "'Space Mono', monospace",
                fontSize: 12,
                fontWeight: 700,
                color: COLORS.black,
                cursor: "pointer",
                marginBottom: 40,
                textTransform: "uppercase",
              }}
            >
              ← BACK TO SHOP
            </button>

            {/* PRODUCT */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 60,
                alignItems: "center",
              }}
            >
              {/* POSTER */}
              <div
                style={{
                  background: selectedPoster.bg,
                  border: `2px solid ${COLORS.black}`,
                  aspectRatio: "3 / 4",
                  overflow: "hidden",
                  maxWidth: 500,
                  width: "100%",
                  margin: "0 auto",
                }}
              >
                {selectedPoster.image ? (
                  <img
                    src={selectedPoster.image}
                    alt={selectedPoster.title}
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                      display: "block",
                    }}
                  />
                ) : (
                  <div
                    style={{
                      width: "100%",
                      height: "100%",
                      display: "flex",
                      alignItems: "flex-end",
                      padding: 24,
                      boxSizing: "border-box",
                    }}
                  >
                    <ShardWord
                      text={selectedPoster.title}
                      fontSize={48}
                      fg={selectedPoster.fg}
                      shadowA={selectedPoster.shadowA}
                      shadowB={selectedPoster.shadowB}
                    />
                  </div>
                )}
              </div>

              {/* DETAILS */}
              <div>
                <div
                  style={{
                    fontFamily: "'Space Mono', monospace",
                    fontSize: 12,
                    color: COLORS.blue,
                    fontWeight: 700,
                    textTransform: "uppercase",
                    marginBottom: 14,
                  }}
                >
                  {selectedPoster.tag}
                </div>

                <ShardWord
                  text={selectedPoster.title}
                  fontSize={56}
                  fg={COLORS.black}
                  shadowA={COLORS.white}
                  shadowB={COLORS.yellow}
                />

                <div
                  style={{
                    fontFamily: "'Space Mono', monospace",
                    fontSize: 13,
                    color: COLORS.black,
                    opacity: 0.7,
                    marginTop: 18,
                  }}
                >
                  {selectedPoster.sub}
                </div>

                <div
                  style={{
                    fontFamily: "'Space Mono', monospace",
                    fontSize: 13,
                    fontWeight: 700,
                    color: COLORS.black,
                    marginTop: 24,
                    textTransform: "uppercase",
                  }}
                >
                  Choose your size
                </div>

                <div
                  style={{
                    display: "flex",
                    gap: 12,
                    marginTop: 12,
                    flexWrap: "wrap",
                  }}
                >
                  <button
                    onClick={() => setSelectedSize("A4")}
                    style={{
                      padding: "12px 18px",
                      border: `2px solid ${COLORS.black}`,
                      background: selectedSize === "A4" ? COLORS.black : COLORS.white,
                      color: selectedSize === "A4" ? COLORS.white : COLORS.black,
                      fontFamily: "'Space Mono', monospace",
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    A4 — ₹{selectedPoster.priceA4}
                  </button>

                  <button
                    onClick={() => setSelectedSize("4x6")}
                    style={{
                      padding: "12px 18px",
                      border: `2px solid ${COLORS.black}`,
                      background: selectedSize === "4x6" ? COLORS.black : COLORS.white,
                      color: selectedSize === "4x6" ? COLORS.white : COLORS.black,
                      fontFamily: "'Space Mono', monospace",
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    4" × 6" — ₹{selectedPoster.price4x6}
                  </button>
                </div>

                <div
                  style={{
                    fontFamily: "'Anton', sans-serif",
                    fontSize: 32,
                    color: COLORS.black,
                    marginTop: 20,
                  }}
                >
                  ₹{
                    selectedSize === "A4"
                      ? selectedPoster.priceA4
                      : selectedPoster.price4x6
                  }
                </div>

                <p
                  style={{
                    fontFamily: "'Inter', sans-serif",
                    fontSize: 15,
                    lineHeight: 1.7,
                    color: "rgba(0,0,0,0.7)",
                    marginTop: 20,
                    maxWidth: 420,
                  }}
                >
                  A limited graphic print from the collection. Designed to stand
                  out and made for your wall.
                </p>

                <button
                  onClick={() => addToCart(selectedPoster, selectedSize)}
                  style={{
                    marginTop: 28,
                    background: COLORS.yellow,
                    color: COLORS.black,
                    border: `2px solid ${COLORS.black}`,
                    padding: "15px 24px",
                    fontFamily: "'Space Mono', monospace",
                    fontSize: 13,
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <Plus size={16} />
                  Add to cart
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
      {!selectedPoster && (
        <div id="shop" style={{ background: COLORS.white, padding: "50px 32px 80px" }}>
          <div style={{ maxWidth: 1100, margin: "0 auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 24, flexWrap: "wrap", gap: 16 }}>
              <div style={{ fontFamily: "'Anton', sans-serif", fontSize: 32, color: COLORS.black, textTransform: "uppercase" }}>The drop</div>
              <div style={{ display: "flex", gap: 8 }}>
                {CATEGORIES.map((c) => (
                  <button
                    key={c}
                    onClick={() => setFilter(c)}
                    style={{
                      fontFamily: "'Space Mono', monospace",
                      fontSize: 12,
                      padding: "8px 14px",
                      border: `1.5px solid ${COLORS.black}`,
                      background: filter === c ? COLORS.black : "transparent",
                      color: filter === c ? COLORS.white : COLORS.black,
                      cursor: "pointer",
                      textTransform: "uppercase",
                    }}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 36 }}>
              {filtered.map((poster) => (
                <PosterCard
                  key={poster.id}
                  poster={poster}
                  onAdd={addToCart}
                  onSelect={setSelectedPoster}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      <div id="about" style={{ background: COLORS.black, padding: "40px 32px", borderTop: `2px solid rgba(255,255,255,0.2)` }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 20 }}>
          <div>
            <div style={{ fontFamily: "'Anton', sans-serif", fontSize: 20, color: COLORS.white, textTransform: "uppercase" }}>SIDHARTH</div>
            <div style={{ display: "flex", gap: 14, marginTop: 10, flexWrap: "wrap" }}>
              <a
                href="https://www.instagram.com/heisenbrg.psd"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  fontFamily: "'Space Mono', monospace",
                  fontSize: 11,
                  color: COLORS.yellow,
                  textDecoration: "none",
                  borderBottom: `1px solid ${COLORS.yellow}`,
                  paddingBottom: 1,
                  transition: "opacity 0.2s ease",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.opacity = "0.75"; }}
                onMouseLeave={(e) => { e.currentTarget.style.opacity = "1"; }}
              >
                @heisenbrg.psd
              </a>
              <a
                href="https://www.instagram.com/wakeup.ssidd"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  fontFamily: "'Space Mono', monospace",
                  fontSize: 11,
                  color: COLORS.yellow,
                  textDecoration: "none",
                  borderBottom: `1px solid ${COLORS.yellow}`,
                  paddingBottom: 1,
                  transition: "opacity 0.2s ease",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.opacity = "0.75"; }}
                onMouseLeave={(e) => { e.currentTarget.style.opacity = "1"; }}
              >
                @wakeup.ssidd
              </a>
            </div>
            <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 11, color: "rgba(255,255,255,0.6)", marginTop: 6 }}>
              Printed in small batches. No two runs identical.
            </div>
          </div>
          <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 11, color: "rgba(255,255,255,0.6)" }}>
            Designed to Stand Out
          </div>
        </div>
      </div>

      <CartDrawer
        open={cartOpen}
        onClose={() => setCartOpen(false)}
        cart={cart}
        posters={posters}
        onQty={changeQty}
        onSetQty={setQty}
        onRemove={removeFromCart}
        onCheckout={() => setCheckoutOpen(true)}
      />
      <CheckoutModal
        open={checkoutOpen}
        onClose={closeCheckout}
        subtotal={subtotal}
        onConfirm={handleWhatsAppOrder}
        isSubmitting={isSubmitting}
      />
      <OrderConfirmation
        order={confirmedOrder}
        onClose={() => setConfirmedOrder(null)}
      />
    </div>
  );
}
export default function App() {
  const isCreatorPage = window.location.pathname === "/creator";

  if (isCreatorPage) {
    return <CreatorPage />;
  }

  return <PosterShop />;
}