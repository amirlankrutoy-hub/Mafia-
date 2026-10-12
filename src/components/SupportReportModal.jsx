import { useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faHeadset } from "@fortawesome/free-solid-svg-icons";
import Modal from "./ui/Modal";
import { sendSupportReport } from "../services/presence";
import { toast } from "../services/toast";

const TYPES = [
  { id: "bug", label: "🐞 Баг" },
  { id: "ban", label: "⛔ Нарушитель" },
  { id: "other", label: "💬 Другое" }
];

// Саппорт сообщает администратору о баге, нарушителе и т.п.
export default function SupportReportModal({ open, onClose }) {
  const [type, setType] = useState("bug");
  const [text, setText] = useState("");
  const [targetId, setTargetId] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    const res = await sendSupportReport(type, text, type === "ban" ? targetId : null);
    setBusy(false);
    if (!res?.success) return toast({ kind: "error", text: res?.message || "Не отправлено" });
    toast({ kind: "success", title: "Отправлено администратору", text: "Спасибо! Мы разберёмся." });
    setText("");
    setTargetId("");
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose}>
      <form onSubmit={submit}>
        <div className="text-center">
          <FontAwesomeIcon icon={faHeadset} className="text-3xl text-emerald-400" />
          <h3 className="mt-2 font-display text-2xl font-black gold-text">Связь с администрацией</h3>
          <p className="mt-1 text-xs text-[#a8916c]">Сообщение увидит администратор в админ-панели</p>
        </div>
        <div className="tabs mt-5 w-full justify-center">
          {TYPES.map((t) => (
            <button key={t.id} type="button" className="tab" aria-selected={type === t.id} onClick={() => setType(t.id)}>
              {t.label}
            </button>
          ))}
        </div>
        {type === "ban" && (
          <input
            value={targetId}
            onChange={(e) => setTargetId(e.target.value.replace(/\D/g, ""))}
            placeholder="ID нарушителя (если знаете)"
            inputMode="numeric"
            className="input-noir mt-3 font-mono"
          />
        )}
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={5}
          maxLength={600}
          placeholder={type === "bug" ? "Что случилось и как это повторить?" : type === "ban" ? "Что нарушил игрок?" : "Ваше сообщение"}
          className="input-noir mt-3 resize-none"
        />
        <button disabled={busy || text.trim().length < 5} className="btn btn-gold mt-4 w-full">
          {busy ? "Отправляем…" : "Отправить"}
        </button>
      </form>
    </Modal>
  );
}
