/**
 * =====================================================
 * PORTAL DE VINCULACIÓN TRVELY
 * corregir-documentos.js
 * El asesor se identifica con documento + correo, ve sus
 * documentos rechazados y sube la versión corregida.
 * =====================================================
 */

const BUCKET_DOCUMENTOS = "documentos";
const TAMANO_MAXIMO_ARCHIVO = 3 * 1024 * 1024; // 3 MB

const TIEMPO_CARGA_PAGINA = Date.now();
const TIEMPO_MINIMO_ENVIO_MS = 2000;

const formBuscar = document.getElementById("form-buscar");
const pasoBuscar = document.getElementById("paso-buscar");
const pasoDocumentos = document.getElementById("paso-documentos");
const buscarError = document.getElementById("buscar-error");
const buscarVacio = document.getElementById("buscar-vacio");
const nombreCandidatoTitulo = document.getElementById("nombre-candidato-titulo");
const listaDocumentosEl = document.getElementById("lista-documentos-rechazados");

let numeroDocumentoActual = "";
let correoActual = "";
let candidatoIdActual = "";


/*
|--------------------------------------------------------------------------
| PASO 1: BUSCAR DOCUMENTOS RECHAZADOS
|--------------------------------------------------------------------------
*/

formBuscar.addEventListener("submit", async function (event) {

    event.preventDefault();

    buscarError.style.display = "none";
    buscarVacio.style.display = "none";

    // Anti-spam: honeypot + tiempo mínimo
    const campoTrampa = document.getElementById("sitio_web");

    if (campoTrampa && campoTrampa.value.trim() !== "") {
        return;
    }

    if (Date.now() - TIEMPO_CARGA_PAGINA < TIEMPO_MINIMO_ENVIO_MS) {
        return;
    }

    const boton = formBuscar.querySelector(".btn-primary-custom");
    const textoOriginal = boton.textContent;

    boton.disabled = true;
    boton.textContent = "Buscando...";

    const numeroDocumento = document.getElementById("numero_documento_buscar").value.trim();
    const correo = document.getElementById("correo_buscar").value.trim();

    try {

        const { data, error } =
            await window.supabaseClient
                .rpc("obtener_documentos_rechazados", {
                    p_numero_documento: numeroDocumento,
                    p_correo: correo
                });

        if (error) {
            throw error;
        }

        if (!data || data.length === 0) {
            buscarVacio.textContent =
                "No encontramos documentos pendientes de corrección con esos datos. " +
                "Verificá que el número de documento y el correo sean los mismos que usaste al registrarte.";
            buscarVacio.style.display = "block";
            return;
        }

        numeroDocumentoActual = numeroDocumento;
        correoActual = correo;
        candidatoIdActual = data[0].candidato_id;

        mostrarDocumentosRechazados(data);

    } catch (error) {

        console.error(error);

        buscarError.textContent =
            "Hubo un error al buscar tus documentos. Intentá de nuevo en unos minutos.";
        buscarError.style.display = "block";

    } finally {

        boton.disabled = false;
        boton.textContent = textoOriginal;
    }
});


/*
|--------------------------------------------------------------------------
| PASO 2: MOSTRAR Y REENVIAR
|--------------------------------------------------------------------------
*/

function mostrarDocumentosRechazados(documentos) {

    nombreCandidatoTitulo.textContent =
        "Hola, " + (documentos[0].nombre_completo || "") + " 👋";

    listaDocumentosEl.innerHTML = "";

    documentos.forEach(function (doc) {

        const fila = document.createElement("div");
        fila.className = "documento-revision";
        fila.dataset.docId = doc.documento_id;

        fila.innerHTML =
            '<div>' +
                '<span class="nombre-doc">' + doc.tipo_documento + '</span><br>' +
                '<span class="badge-estado badge-rechazado">Rechazado</span>' +
                (doc.motivo_rechazo
                    ? '<p class="motivo-rechazo">Motivo: ' + doc.motivo_rechazo + '</p>'
                    : '') +
            '</div>' +
            '<div class="acciones-reenvio">' +
                '<input type="file" class="form-control input-reenvio" accept=".pdf,.jpg,.jpeg,.png">' +
                '<button class="btn-primary-custom btn-reenviar">Reenviar</button>' +
                '<p class="reenvio-mensaje"></p>' +
            '</div>';

        listaDocumentosEl.appendChild(fila);

        const btnReenviar = fila.querySelector(".btn-reenviar");
        const inputArchivo = fila.querySelector(".input-reenvio");
        const mensajeEl = fila.querySelector(".reenvio-mensaje");

        btnReenviar.addEventListener("click", async function () {
            await reenviarDocumento(doc.documento_id, inputArchivo, btnReenviar, mensajeEl, fila);
        });
    });

    pasoBuscar.style.display = "none";
    pasoDocumentos.style.display = "block";
}


async function reenviarDocumento(documentoId, inputArchivo, boton, mensajeEl, fila) {

    mensajeEl.textContent = "";
    mensajeEl.className = "reenvio-mensaje";

    const archivo = inputArchivo.files[0];

    if (!archivo) {
        mensajeEl.textContent = "Elegí un archivo antes de reenviar.";
        mensajeEl.classList.add("reenvio-error");
        return;
    }

    if (archivo.size > TAMANO_MAXIMO_ARCHIVO) {
        mensajeEl.textContent = "El archivo supera el tamaño máximo permitido (3 MB).";
        mensajeEl.classList.add("reenvio-error");
        return;
    }

    const textoOriginal = boton.textContent;
    boton.disabled = true;
    boton.textContent = "Enviando...";

    try {

        const nombreSeguro = archivo.name.replace(/[^a-zA-Z0-9._-]/g, "_");

        const rutaStorage =
            candidatoIdActual + "/" +
            documentoId + "-" +
            Date.now() + "-" +
            nombreSeguro;

        const { error: errorSubida } =
            await window.supabaseClient
                .storage
                .from(BUCKET_DOCUMENTOS)
                .upload(rutaStorage, archivo);

        if (errorSubida) {
            throw errorSubida;
        }

        const { data: actualizado, error: errorActualizar } =
            await window.supabaseClient
                .rpc("reenviar_documento", {
                    p_documento_id: documentoId,
                    p_numero_documento: numeroDocumentoActual,
                    p_correo: correoActual,
                    p_nueva_ruta: rutaStorage,
                    p_nuevo_nombre: archivo.name
                });

        if (errorActualizar) {
            throw errorActualizar;
        }

        if (!actualizado) {
            throw new Error("No se pudo actualizar el documento. Intentá de nuevo.");
        }

        mensajeEl.textContent = "✓ Documento reenviado, queda pendiente de revisión.";
        mensajeEl.classList.add("reenvio-ok");

        inputArchivo.disabled = true;
        boton.remove();

    } catch (error) {

        console.error(error);

        mensajeEl.textContent = "Hubo un error al reenviar el documento. Intentá de nuevo.";
        mensajeEl.classList.add("reenvio-error");

        boton.disabled = false;
        boton.textContent = textoOriginal;
    }
}
