import { Component } from "react";

// Если в интерфейсе что-то сломалось — показываем понятный экран с кнопкой,
// а не пустой чёрный экран (раньше любая ошибка в лобби "гасила" всю страницу).
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error("UI error:", error, info?.componentStack);
  }

  componentDidUpdate(prev) {
    if (this.state.error && prev.resetKey !== this.props.resetKey) {
      this.setState({ error: null });
    }
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="relative flex min-h-[70vh] items-center justify-center p-6">
        <div className="noir-card deco-corners max-w-md p-8 text-center anim-scale-in">
          <img src="/logo-256.webp" alt="" className="mx-auto h-20 w-20 opacity-90" />
          <h2 className="mt-4 font-display text-2xl font-bold gold-text">Что-то пошло не так</h2>
          <p className="mt-2 text-sm text-[#a8916c]">
            Мы уже восстанавливаем экран. Ваша комната и игра сохранены на сервере.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <button className="btn btn-gold" onClick={() => this.setState({ error: null })}>
              Вернуться
            </button>
            <button className="btn btn-ghost" onClick={() => window.location.reload()}>
              Обновить страницу
            </button>
          </div>
        </div>
      </div>
    );
  }
}
