// avatars.js — каталог аватарок.
//  free    — доступны всем сразу
//  shop    — продаются в магазине (вкладка «Аватарки»)
//  admin   — только для администраторов
//  support — только для тех, кого админ назначил саппортом

const NOIR_PRICE = 1200;
const NIGHT_PRICE = 1500;

export const AVATARS = [
  { id: "gray1", src: "/avatars/premium/gray1.webp", name: "Гангстер с томми-ганом", tier: "free" },
  { id: "gray2", src: "/avatars/premium/gray2.webp", name: "Дама у машины", tier: "free" },
  { id: "gray3", src: "/avatars/premium/gray3.webp", name: "Человек в плаще", tier: "free" },
  ...Array.from({ length: 20 }, (_, i) => ({
    id: `a${i + 1}`,
    src: `/avatars/avatar${i + 1}.svg`,
    name: `Персонаж ${i + 1}`,
    tier: "free"
  })),
  { id: "noir1", src: "/avatars/premium/noir1.webp", name: "Босс с сигарой", tier: "shop", price: NOIR_PRICE, collection: "sunset" },
  { id: "noir2", src: "/avatars/premium/noir2.webp", name: "Леди с автоматом", tier: "shop", price: NOIR_PRICE, collection: "sunset" },
  { id: "noir3", src: "/avatars/premium/noir3.webp", name: "Дама в перьях", tier: "shop", price: NOIR_PRICE, collection: "sunset" },
  { id: "noir4", src: "/avatars/premium/noir4.webp", name: "Вдова с розами", tier: "shop", price: NOIR_PRICE, collection: "sunset" },
  { id: "noir5", src: "/avatars/premium/noir5.webp", name: "Стрелок в профиль", tier: "shop", price: NOIR_PRICE, collection: "sunset" },
  // Коллекция «Ночь» — синий неон
  { id: "night1", src: "/avatars/premium/night1.webp", name: "Королева ночи", tier: "shop", price: NIGHT_PRICE, collection: "night" },
  { id: "night2", src: "/avatars/premium/night2.webp", name: "Ночной убийца", tier: "shop", price: NIGHT_PRICE, collection: "night" },
  { id: "night3", src: "/avatars/premium/night3.webp", name: "Дама с веером", tier: "shop", price: NIGHT_PRICE, collection: "night" },
  { id: "night4", src: "/avatars/premium/night4.webp", name: "Лунный волк", tier: "shop", price: NIGHT_PRICE, collection: "night" },
  { id: "night5", src: "/avatars/premium/night5.webp", name: "Ночной шериф", tier: "shop", price: NIGHT_PRICE, collection: "night" },
  { id: "night6", src: "/avatars/premium/night6.webp", name: "Спецназ", tier: "shop", price: NIGHT_PRICE, collection: "night" },
  { id: "night7", src: "/avatars/premium/night7.webp", name: "Незнакомка в капюшоне", tier: "shop", price: NIGHT_PRICE, collection: "night" },
  { id: "night8", src: "/avatars/premium/night8.webp", name: "Сыщик", tier: "shop", price: NIGHT_PRICE, collection: "night" },
  { id: "night9", src: "/avatars/premium/night9.webp", name: "Неоновый детектив", tier: "shop", price: NIGHT_PRICE, collection: "night" },
  { id: "admin_throne", src: "/avatars/premium/admin.webp", name: "Король на троне", tier: "admin" },
  { id: "support_green", src: "/avatars/premium/support.webp", name: "Зелёная энергия", tier: "support" },
  { id: "admin_old", src: "/avatars/avatar_admin.svg", name: "Администратор", tier: "admin" }
];

export const COLLECTIONS = [
  { id: "night", name: "Ночь", text: "Синий неон ночного города. Новая коллекция." },
  { id: "sunset", name: "Закат", text: "Тёплый нуар на закате." }
];

export const DEFAULT_AVATAR = "/avatars/premium/gray1.webp";

export const avatarBySrc = (src) => AVATARS.find((a) => a.src === src) || null;
