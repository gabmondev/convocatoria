import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  Calendar,
  Download,
  Plus,
  Trash2,
  Edit2,
  Save,
  X,
  Menu,
  Search,
  Filter,
  FileText,
  Users,
  Image,
} from "lucide-react";
import html2pdf from "html2pdf.js";

const App = () => {
  const [families, setFamilies] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [newFamily, setNewFamily] = useState({ name: "", month: 0, sunday: 1 });
  const [currentPage, setCurrentPage] = useState("home");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterMonth, setFilterMonth] = useState("all");
  const [alert, setAlert] = useState({ show: false, message: "", type: "" });
  const [confirmDialog, setConfirmDialog] = useState({
    show: false,
    onConfirm: null,
  });
  const printRef = useRef();

  const months = [
    "ENERO",
    "FEBRERO",
    "MARZO",
    "ABRIL",
    "MAYO",
    "JUNIO",
    "JULIO",
    "AGOSTO",
    "SEPTIEMBRE",
    "OCTUBRE",
    "NOVIEMBRE",
    "DICIEMBRE",
  ];

  // Año objetivo para las asignaciones
  const YEAR = 2026;

  // Precalcular los domingos por mes para el año 2026
  const sundaysByMonth = useMemo(() => {
    const result = Array.from({ length: 12 }, (_, month) => {
      const firstDay = new Date(YEAR, month, 1);
      const lastDay = new Date(YEAR, month + 1, 0);
      const sundays = [];
      for (
        let d = new Date(firstDay);
        d <= lastDay;
        d.setDate(d.getDate() + 1)
      ) {
        if (d.getDay() === 0) sundays.push(d.getDate());
      }
      return sundays;
    });
    return result;
  }, [YEAR]);

  useEffect(() => {
    const saved = localStorage.getItem("families");
    if (saved) setFamilies(JSON.parse(saved));
  }, []);

  useEffect(() => {
    const availableSundays = getAvailableSundays(newFamily.month);
    if (availableSundays.length > 0) {
      if (!availableSundays.includes(newFamily.sunday)) {
        setNewFamily((prev) => ({ ...prev, sunday: availableSundays[0] }));
      }
    }
  }, [newFamily.month, families]);

  const saveData = (data) => {
    localStorage.setItem("families", JSON.stringify(data));
    setFamilies(data);
  };

  const getSundaysInMonth = (month) => {
    if (month < 0 || month > 11) return [];
    return sundaysByMonth[month] || [];
  };

  const getAvailableSundays = (month) => {
    const allSundays = getSundaysInMonth(month);
    const registered = families
      .filter((f) => f.month === month)
      .map((f) => f.sunday);
    return allSundays.filter((sunday) => !registered.includes(sunday));
  };

  const addFamily = () => {
    if (!newFamily.name.trim()) {
      setAlert({
        show: true,
        message: "Ingresa el nombre de la familia",
        type: "warning",
      });
      return;
    }
    const available = getAvailableSundays(newFamily.month);
    if (available.length === 0) {
      setAlert({
        show: true,
        message: "Este mes ya está lleno",
        type: "warning",
      });
      return;
    }
    if (
      families.some(
        (f) => f.month === newFamily.month && f.sunday === newFamily.sunday
      )
    ) {
      setAlert({
        show: true,
        message: "Esta fecha ya está registrada",
        type: "warning",
      });
      return;
    }
    const updatedFamilies = [...families, { ...newFamily, id: Date.now() }];
    saveData(updatedFamilies);

    // Mantener el mes actual y seleccionar el primer domingo disponible
    const remainingSundays = getAvailableSundays(newFamily.month).filter(
      (day) => day !== newFamily.sunday
    );

    setNewFamily({
      name: "",
      month: newFamily.month,
      sunday: remainingSundays.length > 0 ? remainingSundays[0] : 1,
    });

    setAlert({
      show: true,
      message: "Familia agregada correctamente",
      type: "success",
    });
  };

  const deleteFamily = (id) => {
    setConfirmDialog({
      show: true,
      onConfirm: () => {
        saveData(families.filter((f) => f.id !== id));
        setConfirmDialog({ show: false, onConfirm: null });
        setAlert({ show: true, message: "Familia eliminada", type: "success" });
      },
    });
  };

  const saveEdit = (id, field, value) => {
    saveData(families.map((f) => (f.id === id ? { ...f, [field]: value } : f)));
  };

  const filteredFamilies = families.filter((family) => {
    const matchesSearch = family.name
      .toLowerCase()
      .includes(searchTerm.toLowerCase());
    const matchesMonth =
      filterMonth === "all" || family.month === parseInt(filterMonth);
    return matchesSearch && matchesMonth;
  });

  const downloadPDF = () => {
    const opt = {
      margin: [5, 5, 5, 5],
      filename: `convocatoria-floral-${YEAR}.pdf`,
      image: { type: "jpeg", quality: 0.98 },
      html2canvas: {
        scale: 2, // Mantiene alta resolución (nitidez)
        useCORS: true, // Permite cargar imágenes externas si las hubiera
        scrollY: 0, // CRUCIAL: Evita que el PDF salga desplazado hacia arriba/abajo
        letterRendering: true,
      },
      jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
    };
    html2pdf().set(opt).from(printRef.current).save();
  };

  const downloadImage = async () => {
    const html2canvas = (await import("html2canvas")).default;
    const element = printRef.current;

    // Temporalmente hacer visible el elemento
    const parent = element.parentElement;
    parent.style.display = "block";
    parent.style.position = "absolute";
    parent.style.left = "-9999px";
    parent.style.top = "0";

    try {
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        letterRendering: true,
        backgroundColor: "#ffffff",
      });

      const link = document.createElement("a");
      link.download = `convocatoria-floral-${YEAR}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    } finally {
      // Volver a ocultar el elemento
      parent.style.display = "none";
      parent.style.position = "";
      parent.style.left = "";
      parent.style.top = "";
    }
  };

  const getMonthData = (monthIndex) => {
    const assigned = families.filter((f) => f.month === monthIndex);
    const allSundays = getSundaysInMonth(monthIndex);
    const missing = allSundays.filter(
      (sunday) => !assigned.some((f) => f.sunday === sunday)
    );
    return { assigned, missing };
  };

  // --- COLORES DEFINIDOS (MIDNIGHT GOLD) ---
  const colors = {
    bg: "#0F172A", // Slate 900
    card: "#1E293B", // Slate 800
    border: "#334155", // Slate 700
    textMain: "#F8FAFC", // Slate 50
    textMuted: "#94A3B8", // Slate 400
    primary: "#FDE047", // Yellow 300 (Acento principal)
    primaryText: "#0F172A", // Texto sobre el amarillo
    inputBg: "#0F172A",
    success: "#2DD4BF", // Teal
    danger: "#EF4444", // Red
  };

  return (
    <div
      className="min-h-screen"
      style={{ backgroundColor: colors.bg, color: colors.textMain }}
    >
      {/* --- MODAL DE ALERTA --- */}
      {alert.show && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[100] p-4 backdrop-blur-sm">
          <div
            className="rounded-xl shadow-2xl max-w-md w-full animate-fadeIn border"
            style={{ backgroundColor: colors.card, borderColor: colors.border }}
          >
            <div
              className="p-4 rounded-t-xl"
              style={{
                backgroundColor:
                  alert.type === "success"
                    ? "rgba(45, 212, 191, 0.2)"
                    : "rgba(251, 146, 60, 0.2)",
              }}
            >
              <div className="flex items-center gap-3">
                <div className="rounded-full p-2 bg-white/10">
                  {alert.type === "success" ? (
                    <Users
                      className="w-6 h-6"
                      style={{ color: colors.success }}
                    />
                  ) : (
                    <FileText className="w-6 h-6 text-orange-400" />
                  )}
                </div>
                <p
                  className="flex-1 font-bold text-lg"
                  style={{ color: colors.textMain }}
                >
                  {alert.message}
                </p>
              </div>
            </div>
            <div className="p-4">
              <button
                onClick={() => setAlert({ show: false, message: "", type: "" })}
                className="w-full py-2 px-4 rounded-lg font-bold transition-colors"
                style={{
                  backgroundColor: colors.primary,
                  color: colors.primaryText,
                }}
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL DE CONFIRMACIÓN --- */}
      {confirmDialog.show && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[100] p-4 backdrop-blur-sm">
          <div
            className="rounded-xl shadow-2xl max-w-md w-full border"
            style={{ backgroundColor: colors.card, borderColor: colors.border }}
          >
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="rounded-full p-2 bg-red-500/20">
                  <Trash2 className="w-6 h-6 text-red-500" />
                </div>
                <h3
                  className="text-xl font-bold"
                  style={{ color: colors.textMain }}
                >
                  Confirmar eliminación
                </h3>
              </div>
              <p className="mb-6" style={{ color: colors.textMuted }}>
                ¿Estás seguro de que deseas eliminar esta familia? Esta acción
                no se puede deshacer.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() =>
                    setConfirmDialog({ show: false, onConfirm: null })
                  }
                  className="flex-1 py-2 px-4 rounded-lg font-medium border"
                  style={{ borderColor: colors.border, color: colors.textMain }}
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmDialog.onConfirm}
                  className="flex-1 py-2 px-4 rounded-lg font-bold text-white bg-red-600 hover:bg-red-700"
                >
                  Eliminar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- NAVBAR --- */}
      <nav
        className="shadow-lg sticky top-0 z-50 border-b"
        style={{ backgroundColor: colors.card, borderColor: colors.border }}
      >
        <div className="max-w-6xl mx-auto px-3 sm:px-4">
          <div className="flex items-center justify-between h-16">
            <h1
              className="text-lg sm:text-xl font-black tracking-tight truncate flex items-center gap-2"
              style={{ color: colors.primary }}
            >
              <Calendar className="w-6 h-6" /> Convocatoria
            </h1>

            <div className="hidden md:flex gap-3">
              <button
                onClick={() => setCurrentPage("home")}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  currentPage === "home"
                    ? "bg-white/10 text-yellow-300"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <Users className="w-5 h-5 inline mr-2" />
                Familias
              </button>
              <button
                onClick={() => setCurrentPage("preview")}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  currentPage === "preview"
                    ? "bg-white/10 text-yellow-300"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <FileText className="w-5 h-5 inline mr-2" />
                Vista Previa PDF
              </button>
            </div>

            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-lg text-slate-300"
            >
              <Menu className="w-6 h-6" />
            </button>
          </div>

          {mobileMenuOpen && (
            <div className="md:hidden pb-3 space-y-2 border-t border-slate-700 pt-2">
              <button
                onClick={() => {
                  setCurrentPage("home");
                  setMobileMenuOpen(false);
                }}
                className="w-full text-left px-4 py-3 rounded-lg font-medium text-slate-300 hover:bg-white/5"
              >
                <Users className="w-5 h-5 inline mr-2" /> Familias
              </button>
              <button
                onClick={() => {
                  setCurrentPage("preview");
                  setMobileMenuOpen(false);
                }}
                className="w-full text-left px-4 py-3 rounded-lg font-medium text-slate-300 hover:bg-white/5"
              >
                <FileText className="w-5 h-5 inline mr-2" /> Vista Previa
              </button>
            </div>
          )}
        </div>
      </nav>

      {/* --- MAIN CONTENT --- */}
      <div className="max-w-6xl mx-auto p-3 sm:p-4 pb-10">
        {currentPage === "home" ? (
          <div className="space-y-6">
            {/* Formulario de Agregar */}
            <div
              className="rounded-xl shadow-lg p-4 sm:p-6 border"
              style={{
                backgroundColor: colors.card,
                borderColor: colors.border,
              }}
            >
              <h2
                className="text-lg font-bold mb-4 flex items-center gap-2"
                style={{ color: colors.primary }}
              >
                <Plus className="w-5 h-5" /> Agregar Familia
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
                <div className="sm:col-span-5">
                  <input
                    type="text"
                    placeholder="Nombre de la familia"
                    value={newFamily.name}
                    onChange={(e) =>
                      setNewFamily({ ...newFamily, name: e.target.value })
                    }
                    className="w-full px-4 py-3 rounded-lg focus:ring-2 focus:ring-yellow-400 outline-none text-base transition-all placeholder-slate-500"
                    style={{
                      backgroundColor: colors.inputBg,
                      border: `1px solid ${colors.border}`,
                      color: colors.textMain,
                    }}
                  />
                </div>
                <div className="sm:col-span-3">
                  <select
                    value={newFamily.month}
                    onChange={(e) =>
                      setNewFamily({
                        ...newFamily,
                        month: parseInt(e.target.value),
                      })
                    }
                    className="w-full px-4 py-3 rounded-lg focus:ring-2 focus:ring-yellow-400 outline-none text-base appearance-none cursor-pointer"
                    style={{
                      backgroundColor: colors.inputBg,
                      border: `1px solid ${colors.border}`,
                      color: colors.textMain,
                    }}
                  >
                    {months.map((month, idx) => (
                      <option key={idx} value={idx}>
                        {month}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="sm:col-span-4">
                  <select
                    value={newFamily.sunday}
                    onChange={(e) =>
                      setNewFamily({
                        ...newFamily,
                        sunday: parseInt(e.target.value),
                      })
                    }
                    disabled={getAvailableSundays(newFamily.month).length === 0}
                    className="w-full px-4 py-3 rounded-lg focus:ring-2 focus:ring-yellow-400 outline-none text-base appearance-none disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                    style={{
                      backgroundColor: colors.inputBg,
                      border: `1px solid ${colors.border}`,
                      color: colors.textMain,
                    }}
                  >
                    {getAvailableSundays(newFamily.month).length > 0 ? (
                      getAvailableSundays(newFamily.month).map((day) => (
                        <option key={day} value={day}>
                          Domingo {day}
                        </option>
                      ))
                    ) : (
                      <option value="">Lleno</option>
                    )}
                  </select>
                  {getAvailableSundays(newFamily.month).length === 0 && (
                    <p className="mt-2 text-sm text-red-400">
                      Este mes está lleno.
                    </p>
                  )}
                </div>
              </div>
              <button
                onClick={addFamily}
                disabled={
                  getAvailableSundays(newFamily.month).length === 0 ||
                  !newFamily.name.trim()
                }
                className="mt-4 w-full sm:w-auto px-8 py-3 rounded-lg font-bold text-base shadow-lg shadow-yellow-900/20 hover:scale-[1.02] transition-transform disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  backgroundColor: colors.primary,
                  color: colors.primaryText,
                }}
              >
                Agregar al Rol
              </button>
            </div>

            {/* Lista y Filtros */}
            <div
              className="rounded-xl shadow-lg p-4 sm:p-6 border"
              style={{
                backgroundColor: colors.card,
                borderColor: colors.border,
              }}
            >
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                <h2
                  className="text-lg font-bold flex items-center gap-2"
                  style={{ color: colors.textMain }}
                >
                  <Users className="w-5 h-5 text-slate-400" /> Lista (
                  {filteredFamilies.length})
                </h2>

                <div className="flex gap-2 w-full sm:w-auto">
                  <div className="relative flex-1 sm:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input
                      type="text"
                      placeholder="Buscar..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 rounded-lg text-sm focus:ring-1 focus:ring-yellow-400 outline-none"
                      style={{
                        backgroundColor: colors.inputBg,
                        border: `1px solid ${colors.border}`,
                        color: colors.textMain,
                      }}
                    />
                  </div>
                  <div className="relative w-40">
                    <select
                      value={filterMonth}
                      onChange={(e) => setFilterMonth(e.target.value)}
                      className="w-full pl-3 pr-8 py-2 rounded-lg text-sm appearance-none focus:ring-1 focus:ring-yellow-400 outline-none cursor-pointer"
                      style={{
                        backgroundColor: colors.inputBg,
                        border: `1px solid ${colors.border}`,
                        color: colors.textMain,
                      }}
                    >
                      <option value="all">Todo el año</option>
                      {months.map((month, idx) => (
                        <option key={idx} value={idx}>
                          {month}
                        </option>
                      ))}
                    </select>
                    <Filter className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                  </div>
                </div>
              </div>

              {/* Tabla Desktop */}
              <div
                className="hidden sm:block overflow-x-auto rounded-lg border"
                style={{ borderColor: colors.border }}
              >
                <table className="w-full">
                  <thead style={{ backgroundColor: "#0F172A" }}>
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-400">
                        Familia
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-400">
                        Mes
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-bold uppercase tracking-wider text-slate-400">
                        Día
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-bold uppercase tracking-wider text-slate-400">
                        Acciones
                      </th>
                    </tr>
                  </thead>
                  <tbody
                    className="divide-y"
                    style={{ divideColor: colors.border }}
                  >
                    {filteredFamilies
                      .sort((a, b) => a.month - b.month || a.sunday - b.sunday)
                      .map((family) => (
                        <tr
                          key={family.id}
                          className="hover:bg-white/5 transition-colors group"
                        >
                          <td className="px-4 py-3 font-medium">
                            {editingId === family.id ? (
                              <input
                                type="text"
                                defaultValue={family.name}
                                onBlur={(e) =>
                                  saveEdit(family.id, "name", e.target.value)
                                }
                                className="w-full px-2 py-1 rounded bg-slate-900 border border-slate-600 text-white focus:border-yellow-400 outline-none"
                                autoFocus
                              />
                            ) : (
                              family.name
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <span className="px-2 py-1 rounded text-xs font-bold bg-slate-700 text-slate-200">
                              {months[family.month]}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className="font-mono text-yellow-400 font-bold">
                              {family.sunday}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex justify-center gap-2 opacity-100 sm:opacity-60 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={() =>
                                  editingId === family.id
                                    ? setEditingId(null)
                                    : setEditingId(family.id)
                                }
                                className="p-1.5 rounded hover:bg-slate-700 text-slate-400 hover:text-yellow-400 transition-colors"
                              >
                                {editingId === family.id ? (
                                  <Save className="w-4 h-4" />
                                ) : (
                                  <Edit2 className="w-4 h-4" />
                                )}
                              </button>
                              <button
                                onClick={() => deleteFamily(family.id)}
                                className="p-1.5 rounded hover:bg-slate-700 text-slate-400 hover:text-red-400 transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
                {filteredFamilies.length === 0 && (
                  <p className="text-center text-slate-500 py-12">
                    No hay familias registradas
                  </p>
                )}
              </div>

              {/* Cards Móvil */}
              <div className="sm:hidden space-y-3">
                {filteredFamilies
                  .sort((a, b) => a.month - b.month || a.sunday - b.sunday)
                  .map((family) => (
                    <div
                      key={family.id}
                      className="rounded-lg p-4 border"
                      style={{
                        backgroundColor: colors.inputBg,
                        borderColor: colors.border,
                      }}
                    >
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          {editingId === family.id ? (
                            <input
                              type="text"
                              defaultValue={family.name}
                              onBlur={(e) =>
                                saveEdit(family.id, "name", e.target.value)
                              }
                              className="w-full px-2 py-1 rounded bg-slate-800 border border-slate-600 text-white mb-2"
                              autoFocus
                            />
                          ) : (
                            <h3 className="font-bold text-lg text-white">
                              {family.name}
                            </h3>
                          )}
                          <div className="flex gap-2 text-xs font-semibold mt-1">
                            <span className="bg-slate-700 text-slate-300 px-2 py-0.5 rounded">
                              {months[family.month]}
                            </span>
                            <span className="bg-yellow-400/20 text-yellow-400 px-2 py-0.5 rounded">
                              Día {family.sunday}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2 border-t border-slate-700 pt-3">
                        <button
                          onClick={() =>
                            editingId === family.id
                              ? setEditingId(null)
                              : setEditingId(family.id)
                          }
                          className="flex-1 py-2 rounded bg-slate-800 text-slate-300 text-sm font-medium"
                        >
                          {editingId === family.id ? "Guardar" : "Editar"}
                        </button>
                        <button
                          onClick={() => deleteFamily(family.id)}
                          className="flex-1 py-2 rounded bg-slate-800 text-red-400 text-sm font-medium"
                        >
                          Eliminar
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Header Vista Previa */}
            <div
              className="rounded-xl shadow-lg p-6 border flex flex-col sm:flex-row justify-between items-center gap-4"
              style={{
                backgroundColor: colors.card,
                borderColor: colors.border,
              }}
            >
              <div>
                <h2 className="text-xl font-bold text-white">
                  Vista Previa del Documento
                </h2>
                <p className="text-slate-400 text-sm">
                  Verifica los datos antes de exportar.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                <button
                  onClick={downloadImage}
                  className="w-full sm:w-auto px-6 py-3 rounded-lg font-bold flex items-center justify-center gap-2 hover:brightness-110 transition-all"
                  style={{
                    backgroundColor: colors.card,
                    color: colors.textMain,
                    border: `2px solid ${colors.primary}`,
                  }}
                >
                  <Image className="w-5 h-5" />
                  Descargar Imagen
                </button>
                <button
                  onClick={downloadPDF}
                  className="w-full sm:w-auto px-6 py-3 rounded-lg font-bold flex items-center justify-center gap-2 hover:brightness-110 transition-all"
                  style={{
                    backgroundColor: colors.primary,
                    color: colors.primaryText,
                  }}
                >
                  <Download className="w-5 h-5" />
                  Descargar PDF
                </button>
              </div>
            </div>

            {/* Grid de Resumen (No es el PDF, es para ver datos rápidos) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {months.map((month, idx) => {
                const { assigned, missing } = getMonthData(idx);
                return (
                  <div
                    key={idx}
                    className="rounded-lg border p-4 hover:border-slate-500 transition-colors"
                    style={{
                      backgroundColor: colors.card,
                      borderColor: colors.border,
                    }}
                  >
                    <div className="flex justify-between items-center mb-3">
                      <h3 className="font-bold text-slate-200">{month}</h3>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                          missing.length === 0
                            ? "bg-teal-500/20 text-teal-400"
                            : "bg-slate-700 text-slate-400"
                        }`}
                      >
                        {missing.length === 0
                          ? "Completo"
                          : `${assigned.length} asig.`}
                      </span>
                    </div>

                    {missing.length > 0 && (
                      <div className="bg-red-500/10 p-2 rounded text-xs text-red-400 mb-2">
                        <strong>Faltan:</strong> Días {missing.join(", ")}
                      </div>
                    )}

                    <ul className="text-sm space-y-1 text-slate-300 max-h-32 overflow-y-auto custom-scrollbar">
                      {assigned
                        .sort((a, b) => a.sunday - b.sunday)
                        .map((f) => (
                          <li key={f.id} className="flex gap-2">
                            <span className="text-yellow-500 font-mono w-5">
                              {f.sunday}:
                            </span>
                            <span className="truncate">{f.name}</span>
                          </li>
                        ))}
                      {assigned.length === 0 && (
                        <li className="text-slate-600 italic">Sin asignar</li>
                      )}
                    </ul>
                  </div>
                );
              })}
            </div>

            {/* --- PDF OCULTO --- */}
            <div style={{ display: "none" }}>
              <div
                ref={printRef}
                style={{
                  width: "210mm",
                  minHeight: "297mm",
                  padding: "8mm 10mm",
                  backgroundColor: "#ffffff",
                  color: "#000000",
                  fontFamily: "Arial, sans-serif",
                  boxSizing: "border-box",
                }}
              >
                {/* Encabezado del PDF */}
                <div
                  style={{
                    textAlign: "center",
                    border: "2px solid #000",
                    padding: "5px",
                    marginBottom: "8px",
                  }}
                >
                  <h1
                    style={{
                      fontSize: "20px",
                      fontWeight: 900,
                      margin: "0 0 4px 0",
                      letterSpacing: "6px",
                      textTransform: "uppercase",
                    }}
                  >
                    CONVOCATORIA
                  </h1>
                  <p
                    style={{
                      fontSize: "15px",
                      margin: 0,
                      color: "#000",
                      lineHeight: 1.3,
                      fontStyle: "italic",
                    }}
                  >
                    Cada uno dé como propuso en su corazón: no con tristeza, ni
                    por necesidad, porque Dios ama al dador alegre.
                    <br />
                    <span style={{ fontWeight: "bold" }}>
                      — 2 Corintios 9:7
                    </span>
                  </p>
                </div>

                {/* Grid del PDF - 2 columnas */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "5px",
                    columnGap: "10px",
                  }}
                >
                  {months.map((month, idx) => {
                    const { assigned } = getMonthData(idx);
                    return (
                      <div
                        key={idx}
                        style={{
                          pageBreakInside: "avoid",
                          marginBottom: "0",
                        }}
                      >
                        {/* Header del mes */}
                        <div
                          style={{
                            backgroundColor: "#FFC107",
                            color: "#000",
                            fontWeight: "bold",
                            textAlign: "center",
                            padding: "2.5px",
                            border: "1px solid #000",
                            borderBottom: "none",
                            fontSize: "18px",
                            textTransform: "uppercase",
                            letterSpacing: "1px",
                          }}
                        >
                          {month}
                        </div>

                        {/* Tabla del mes */}
                        <table
                          style={{
                            width: "100%",
                            borderCollapse: "collapse",
                            border: "1px solid #000",
                          }}
                        >
                          <thead>
                            <tr style={{ backgroundColor: "#f5f5f5" }}>
                              <th
                                style={{
                                  border: "1px solid #000",
                                  padding: "2px 4px 5px 5px",
                                  textAlign: "center",
                                  verticalAlign: "middle",
                                  fontWeight: "bold",
                                  fontSize: "16px",
                                  lineHeight: "1.2", // Esto evita que el texto se corte verticalmente
                                }}
                              >
                                FAMILIA
                              </th>
                              <th
                                style={{
                                  border: "1px solid #000",
                                  padding: "2px 4px 5px 5px",
                                  textAlign: "center",
                                  verticalAlign: "middle",
                                  fontWeight: "bold",
                                  fontSize: "16px",
                                  width: "55px",
                                  lineHeight: "1.2", // Esto evita que el texto se corte verticalmente
                                }}
                              >
                                DOMINGO
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {(() => {
                              const allSundays = getSundaysInMonth(idx)
                                .slice()
                                .sort((a, b) => a - b);
                              return allSundays.map((day) => {
                                const family = assigned.find(
                                  (x) => x.sunday === day
                                );
                                return (
                                  <tr key={`${idx}-${day}`}>
                                    <td
                                      style={{
                                        border: "1px solid #000",
                                        padding: "3px 4px 5px 4px",
                                        color: family ? "#000" : "#666",
                                        fontStyle: family ? "normal" : "italic",
                                        fontSize: "16px",
                                        // height: "18px",
                                      }}
                                    >
                                      {family ? family.name : "Disponible"}
                                    </td>
                                    <td
                                      style={{
                                        border: "1px solid #000",
                                        padding: "1px 4px 5px 4px",
                                        textAlign: "center",
                                        fontWeight: "bold",
                                        fontSize: "16px",
                                      }}
                                    >
                                      {day}
                                    </td>
                                  </tr>
                                );
                              });
                            })()}
                          </tbody>
                        </table>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default App;
