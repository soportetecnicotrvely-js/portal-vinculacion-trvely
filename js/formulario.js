/**
 * =====================================================
 * PORTAL DE VINCULACIÓN TRVELY
 * formulario.js v1.0
 * Envía el formulario a Supabase: candidatos + documentos
 * =====================================================
 */

const BUCKET_DOCUMENTOS = "documentos";

// Mapeo: name del input en el HTML -> columna en la tabla candidatos
const MAPEO_CAMPOS = {
    tipo_documento: "tipo_documento",
    numero_docum: "numero_docum",
    nombre_completo: "nombre_completo",
    fecha_nacimiento: "fecha_nacimiento",
    lugar_nacimiento: "lugar_nacimiento",
    nacionalidad: "nacionalidad",
    ciudad_residencia: "ciudad_residencia",
    direccion_residencia: "direccion",
    celular: "celular",
    correo_personal: "correo",
    contacto_emergencia: "contacto_emergencia",
    parentesco_emergencia: "parentesco",
    telefono_emergencia: "telefono_emergencia",
    perfil_aplica: "perfil",
    ciudad_trabajo: "ciudad_labor",
    experiencia_comercial: "experiencia_comercial",
    experiencia_turismo: "experiencia_turismo",
    empresa_actividad_actual: "empresa_actividad_actual",
    referente_vinculacion: "referente"
};

// Checkboxes: name del input -> columna booleana en candidatos
const MAPEO_CHECKBOXES = {
    tratamiento_datos: "autoriza_datos",
    consulta_antecedentes: "autoriza_consulta",
    terminos_uso: "acepta_terminos",
    veracidad_informacion: "declara_veracidad",
    comunicaciones: "acepta_comunicaciones"
};

// Documentos: id del input file -> etiqueta a guardar en la tabla documentos
const CAMPOS_ARCHIVO = {
    documento_cedula: "Cedula",
    hoja_de_vida: "Hoja de Vida",
    certificacion_bancaria: "Certificacion Bancaria",
    rut: "RUT",
    antecedentes_policia: "Antecedentes Policia",
    antecedentes_procuraduria: "Antecedentes Procuraduria",
    antecedentes_contraloria: "Antecedentes Contraloria",
    procesos_judiciales: "Procesos Judiciales"
};

const formulario = document.getElementById("formulario-candidato");

formulario.addEventListener("submit", async function (event) {
    event.preventDefault();

    const boton = formulario.querySelector(".btn-primary-custom");
    const textoOriginal = boton.textContent;
    boton.disabled = true;
    boton.textContent = "Enviando...";

    try {
        const formData = new FormData(formulario);

        // 1. Armar el objeto para la tabla candidatos
        const candidatoData = {};

        Object.keys(MAPEO_CAMPOS).forEach(function (nombreCampo) {
            const columna = MAPEO_CAMPOS[nombreCampo];
            const valor = formData.get(nombreCampo);
            candidatoData[columna] = valor === "" ? null : valor;
        });

        Object.keys(MAPEO_CHECKBOXES).forEach(function (nombreCampo) {
            const columna = MAPEO_CHECKBOXES[nombreCampo];
            const input = formulario.querySelector('[name="' + nombreCampo + '"]');
            candidatoData[columna] = input ? input.checked : false;
        });

        // No hay checkbox de firma en el form todavía: se marca true al enviar.
        candidatoData.acepta_firma = true;

        // 2. Insertar candidato y recuperar su id
        const { data: candidatoInsertado, error: errorCandidato } = await window.supabaseClient
            .from("candidatos")
            .insert(candidatoData)
            .select()
            .single();

        if (errorCandidato) throw errorCandidato;

        const candidatoId = candidatoInsertado.id;

        // 3. Subir cada archivo adjunto e insertar su fila en documentos
        for (const idCampo in CAMPOS_ARCHIVO) {
            const input = document.getElementById(idCampo);
            const archivo = input && input.files[0];
            if (!archivo) continue;

            const rutaStorage = candidatoId + "/" + idCampo + "-" + archivo.name;

            const { error: errorSubida } = await window.supabaseClient
                .storage
                .from(BUCKET_DOCUMENTOS)
                .upload(rutaStorage, archivo);

            if (errorSubida) throw errorSubida;

            const { error: errorDocumento } = await window.supabaseClient
                .from("documentos")
                .insert({
                    candidato_id: candidatoId,
                    tipo_documento: CAMPOS_ARCHIVO[idCampo],
                    nombre_archivo: archivo.name,
                    ruta_storage: rutaStorage
                });

            if (errorDocumento) throw errorDocumento;
        }

        alert("¡Registro enviado correctamente! Gracias por postularte a Trvely.");
        formulario.reset();

        document.querySelectorAll(".file-upload-btn").forEach(function (btn) {
            btn.innerHTML = '<span class="icono">⬆</span> Adjuntar archivo aquí';
            btn.classList.remove("tiene-archivo");
        });

    } catch (error) {
        console.error(error);
        alert("Hubo un error al enviar el formulario: " + (error.message || "intenta de nuevo."));
    } finally {
        boton.disabled = false;
        boton.textContent = textoOriginal;
    }
});
