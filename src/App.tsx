import { useEffect, useState } from "react";
import { jsPDF } from "jspdf";
import "./styles.css";
import { supabase } from "./supabase";

type Persona = {
  id: number;
  nombre: string;
};

export default function App() {
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [nombreJugador, setNombreJugador] = useState("");
  const [respuestas, setRespuestas] = useState<Record<number, string>>({});
  const [enviado, setEnviado] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    cargarPersonas();
  }, []);

  const cargarPersonas = async () => {
    const { data, error } = await supabase
      .from("personas")
      .select("id, nombre")
      .order("id", { ascending: true });

    if (error) {
      console.error("Error al cargar personas:", error);
      alert("No se pudieron cargar las personas.");
      setCargando(false);
      return;
    }

    setPersonas(data || []);
    setCargando(false);
  };

  const cambiarRespuesta = (id: number, valor: string) => {
    setRespuestas((anteriores) => ({
      ...anteriores,
      [id]: valor,
    }));
  };

  const generarPDF = () => {
    const pdf = new jsPDF();

    const margenIzquierdo = 15;
    let y = 20;

    pdf.setTextColor(18, 89, 49);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(20);
    pdf.text("Juego de Primavera", margenIzquierdo, y);

    y += 9;

    pdf.setTextColor(40, 40, 40);
    pdf.setFontSize(11);
    pdf.setFont("helvetica", "normal");
    pdf.text("Molinos Agro", margenIzquierdo, y);

    y += 12;

    pdf.setDrawColor(210, 220, 210);
    pdf.line(15, y, 195, y);

    y += 12;

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(12);
    pdf.text("Participante:", margenIzquierdo, y);

    pdf.setFont("helvetica", "normal");
    pdf.text(nombreJugador.trim(), 45, y);

    y += 14;

    const colPersona = 15;
    const colRespuesta = 105;
    const colCorrecta = 150;

    pdf.setFillColor(232, 244, 232);
    pdf.rect(15, y - 6, 180, 10, "F");

    pdf.setTextColor(25, 95, 52);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(10);

    pdf.text("Persona", colPersona + 2, y);
    pdf.text("Tu respuesta", colRespuesta, y);
    pdf.text("Correcta", colCorrecta, y);

    y += 9;

    pdf.setTextColor(40, 40, 40);
    pdf.setFont("helvetica", "normal");

    personas.forEach((persona, index) => {
      const respuesta = respuestas[persona.id] || "";

      if (y > 275) {
        pdf.addPage();
        y = 20;

        pdf.setFillColor(232, 244, 232);
        pdf.rect(15, y - 6, 180, 10, "F");

        pdf.setTextColor(25, 95, 52);
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(10);

        pdf.text("Persona", colPersona + 2, y);
        pdf.text("Tu respuesta", colRespuesta, y);
        pdf.text("Correcta", colCorrecta, y);

        y += 9;

        pdf.setTextColor(40, 40, 40);
        pdf.setFont("helvetica", "normal");
      }

      if (index % 2 === 0) {
        pdf.setFillColor(249, 251, 247);
        pdf.rect(15, y - 6, 180, 9, "F");
      }

      pdf.text(persona.nombre, colPersona + 2, y);
      pdf.text(respuesta, colRespuesta, y);

      pdf.setDrawColor(100, 100, 100);
      pdf.line(colCorrecta, y + 1, colCorrecta + 32, y + 1);

      y += 9;
    });

    y += 8;

    if (y < 275) {
      pdf.setFontSize(9);
      pdf.setTextColor(110, 110, 110);

      pdf.text(
        "Completá la columna 'Correcta' durante la corrección en vivo.",
        margenIzquierdo,
        y
      );
    }

    const nombreArchivo = nombreJugador
      .trim()
      .replace(/\s+/g, "_")
      .replace(/[^a-zA-Z0-9_áéíóúÁÉÍÓÚñÑ]/g, "");

    pdf.save(`respuestas_${nombreArchivo}.pdf`);
  };

  const enviarRespuestas = async () => {
    if (!nombreJugador.trim()) {
      alert("Ingresá tu nombre y apellido.");
      return;
    }

    if (personas.length === 0) {
      alert("No hay personas cargadas en el juego.");
      return;
    }

    const faltantes = personas.filter((persona) => !respuestas[persona.id]);

    if (faltantes.length > 0) {
      alert(
        `Todavía te faltan responder ${faltantes.length} ${
          faltantes.length === 1 ? "persona" : "personas"
        }.`
      );
      return;
    }

    try {
      setEnviando(true);

      const respuestasParaGuardar = personas.map((persona) => ({
        persona_id: persona.id,
        respuesta_elegida: respuestas[persona.id],
      }));

      const { error } = await supabase.rpc("registrar_participacion", {
        p_nombre: nombreJugador.trim(),
        p_respuestas: respuestasParaGuardar,
      });

      if (error) {
        console.error("Error al guardar participación:", error);
        alert("No se pudieron guardar las respuestas.");
        return;
      }

      generarPDF();
      setEnviado(true);
    } catch (error) {
      console.error("Error inesperado:", error);
      alert("Ocurrió un error inesperado.");
    } finally {
      setEnviando(false);
    }
  };

  const volverAlInicio = () => {
    setNombreJugador("");
    setRespuestas({});
    setEnviado(false);
  };

  const cantidadRespondidas = Object.values(respuestas).filter(
    (respuesta) => respuesta !== ""
  ).length;

  const porcentajeAvance =
    personas.length > 0 ? (cantidadRespondidas / personas.length) * 100 : 0;

  if (cargando) {
    return (
      <div className="pagina">
        <div className="decoracion flor-1">✿</div>
        <div className="decoracion flor-2">✦</div>

        <div className="contenedor cargando">
          <img
            className="logo"
            src="/molinos-agro-logo.png"
            alt="Molinos Agro"
          />

          <div className="spinner"></div>

          <h2>Preparando el juego...</h2>
        </div>
      </div>
    );
  }

  if (enviado) {
    return (
      <div className="pagina">
        <div className="decoracion flor-1">✿</div>
        <div className="decoracion flor-2">✦</div>
        <div className="decoracion flor-3">❀</div>

        <div className="contenedor mensajeFinal">
          <img
            className="logo"
            src="/molinos-agro-logo.png"
            alt="Molinos Agro"
          />

          <div className="iconoExito">✓</div>

          <h1>¡Listo, {nombreJugador.split(" ")[0]}!</h1>

          <p className="mensajePrincipal">
            Tus respuestas quedaron registradas.
          </p>

          <p className="mensajeSecundario">
            Guardá tu PDF porque lo vas a necesitar para la corrección en vivo.
          </p>

          <div className="botonesFinales">
            <button className="botonSecundario" onClick={generarPDF}>
              📄 Descargar PDF nuevamente
            </button>

            <button className="botonHome" onClick={volverAlInicio}>
              🏠 Volver al inicio
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="pagina">
      <div className="decoracion flor-1">✿</div>
      <div className="decoracion flor-2">✦</div>
      <div className="decoracion flor-3">❀</div>
      <div className="decoracion flor-4">✿</div>

      <main className="contenedor">
        <header className="cabecera">
          <img
            className="logo"
            src="/molinos-agro-logo.png"
            alt="Molinos Agro"
          />

          <div className="etiqueta">🌼 Edición Primavera</div>

          <h1>¿Cuánto conocés a tus compañeros?</h1>

          <p className="subtitulo">
            Elegí una opción para cada persona y descubramos cuánto sabemos del
            equipo.
          </p>
        </header>

        <section className="datosJugador">
          <label htmlFor="nombreJugador">👋 Primero, contanos quién sos</label>

          <input
            id="nombreJugador"
            type="text"
            placeholder="Nombre y apellido"
            value={nombreJugador}
            onChange={(e) => setNombreJugador(e.target.value)}
            disabled={enviando}
          />
        </section>

        <section className="progreso">
          <div className="progresoTexto">
            <span>Tu progreso</span>

            <strong>
              {cantidadRespondidas} / {personas.length}
            </strong>
          </div>

          <div className="barraProgreso">
            <div
              className="barraProgresoInterior"
              style={{
                width: `${porcentajeAvance}%`,
              }}
            />
          </div>
        </section>

        <section className="tabla">
          <div className="fila encabezado">
            <div>Persona</div>
            <div>Tu elección</div>
          </div>

          {personas.map((persona, index) => {
            const respondida = Boolean(respuestas[persona.id]);

            return (
              <div
                className={`fila ${respondida ? "filaRespondida" : ""}`}
                key={persona.id}
              >
                <div className="personaInfo">
                  <div className="avatar">{index + 1}</div>

                  <div className="nombre">{persona.nombre}</div>
                </div>

                <select
                  className={respondida ? "selectRespondido" : ""}
                  value={respuestas[persona.id] || ""}
                  onChange={(e) => cambiarRespuesta(persona.id, e.target.value)}
                  disabled={enviando}
                >
                  <option value="">Elegir...</option>

                  <option value="A">A</option>

                  <option value="B">B</option>

                  <option value="C">C</option>

                  <option value="No participó">No participó</option>
                </select>
              </div>
            );
          })}
        </section>

        <div className="pieFormulario">
          <p>🌱 Revisá tus respuestas antes de enviar.</p>

          <button
            className="botonPrincipal"
            onClick={enviarRespuestas}
            disabled={enviando}
          >
            {enviando ? "Guardando respuestas..." : "Enviar mis respuestas"}
          </button>
        </div>
      </main>
    </div>
  );
}
