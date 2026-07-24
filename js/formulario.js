/**
 * =====================================================
 * PORTAL DE VINCULACIÓN TRVELY
 * formulario.js v2.1
 * Envía el formulario a Supabase: candidatos + documentos
 * =====================================================
 */

const BUCKET_DOCUMENTOS = "documentos";

/*
|--------------------------------------------------------------------------
| MAPEO DE CAMPOS DEL FORMULARIO → TABLA candidatos
|--------------------------------------------------------------------------
*/

const MAPEO_CAMPOS = {
    tipo_documento: "tipo_documento",
    numero_documento: "numero_documento",
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
    empresa_actividad_actual: "empresa_actividad_actual",
    referente_vinculacion: "referente"
};

/*
|--------------------------------------------------------------------------
| CHECKBOXES
|--------------------------------------------------------------------------
*/

const MAPEO_CHECKBOXES = {
    tratamiento_datos: "autoriza_datos",
    consulta_antecedentes: "autoriza_consulta",
    terminos_uso: "acepta_terminos",
    veracidad_informacion: "declara_veracidad",
    comunicaciones: "acepta_comunicaciones"
};

/*
|--------------------------------------------------------------------------
| DOCUMENTOS OBLIGATORIOS
| (etiquetas ajustadas para coincidir EXACTO con el enum
| tipo_documento_archivo en Supabase)
|--------------------------------------------------------------------------
*/

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


/*
|--------------------------------------------------------------------------
| FORMULARIO
|--------------------------------------------------------------------------
*/

const formulario = document.getElementById("formulario-candidato");


formulario.addEventListener("submit", async function (event) {

    event.preventDefault();

    const boton = formulario.querySelector(".btn-primary-custom");
    const textoOriginal = boton.textContent;

    /*
    |--------------------------------------------------------------------------
    | 1. VALIDAR DOCUMENTOS OBLIGATORIOS
    |--------------------------------------------------------------------------
    */

    const archivosFaltantes = [];

    for (const idCampo in CAMPOS_ARCHIVO) {

        const input = document.getElementById(idCampo);

        if (!input || !input.files || input.files.length === 0) {
            archivosFaltantes.push(CAMPOS_ARCHIVO[idCampo]);
        }
    }

    if (archivosFaltantes.length > 0) {

        alert(
            "Debes adjuntar todos los documentos obligatorios antes de enviar el formulario.\n\n" +
            "Faltan:\n- " +
            archivosFaltantes.join("\n- ")
        );

        return;
    }


    /*
    |--------------------------------------------------------------------------
    | 2. DESACTIVAR BOTÓN
    |--------------------------------------------------------------------------
    */

    boton.disabled = true;
    boton.textContent = "Enviando...";


    try {

        const formData = new FormData(formulario);

        /*
        |--------------------------------------------------------------------------
        | 3. ARMAR DATOS DEL CANDIDATO
        |--------------------------------------------------------------------------
        */

        const candidatoData = {};

        Object.keys(MAPEO_CAMPOS).forEach(function (nombreCampo) {

            const columna = MAPEO_CAMPOS[nombreCampo];
            const valor = formData.get(nombreCampo);

            candidatoData[columna] =
                valor === "" || valor === null
                    ? null
                    : valor;
        });


        /*
        |--------------------------------------------------------------------------
        | CONVERTIR EL VALOR DEL PERFIL AL VALOR DEL ENUM DE SUPABASE
        |--------------------------------------------------------------------------
        */

        if (candidatoData.perfil === "asesor_comercial") {
            candidatoData.perfil = "Asesor Comercial";
        }

        if (candidatoData.perfil === "director_comercial") {
            candidatoData.perfil = "Director Comercial";
        }


        /*
        |--------------------------------------------------------------------------
        | 4. CHECKBOXES
        |--------------------------------------------------------------------------
        */

        Object.keys(MAPEO_CHECKBOXES).forEach(function (nombreCampo) {

            const columna = MAPEO_CHECKBOXES[nombreCampo];

            const input = formulario.querySelector(
                '[name="' + nombreCampo + '"]'
            );

            candidatoData[columna] = input
                ? input.checked
                : false;
        });


        /*
        |--------------------------------------------------------------------------
        | 5. ACEPTACIÓN DE FIRMA
        |--------------------------------------------------------------------------
        */

        candidatoData.acepta_firma = true;


        /*
        |--------------------------------------------------------------------------
        | 6. INSERTAR CANDIDATO
        |--------------------------------------------------------------------------
        |
        | IMPORTANTE:
        | No usamos .select() aquí porque el INSERT público funciona
        | correctamente sin necesidad de permiso SELECT.
        |
        */
        console.log("DATOS QUE SE ENVIARÁN A SUPABASE:", candidatoData);

        const { error: errorCandidato } =
            await window.supabaseClient
                .from("candidatos")
                .insert(candidatoData);

        if (errorCandidato) {
            console.error("ERROR COMPLETO DE SUPABASE:", errorCandidato);
            throw errorCandidato;
        }


        /*
        |--------------------------------------------------------------------------
        | 7. RECUPERAR EL ID DEL CANDIDATO
        |--------------------------------------------------------------------------
        */

        const { data: candidatoInsertado, error: errorBusqueda } =
            await window.supabaseClient
                .from("candidatos")
                .select("id")
                .eq("numero_documento", candidatoData.numero_documento)
                .eq("correo", candidatoData.correo)
                .order("created_at", { ascending: false })
                .limit(1)
                .maybeSingle();


        if (errorBusqueda) {
            throw errorBusqueda;
        }


        if (!candidatoInsertado) {
            throw new Error(
                "El candidato fue creado, pero no fue posible recuperar su ID."
            );
        }


        const candidatoId = candidatoInsertado.id;


        /*
        |--------------------------------------------------------------------------
        | 8. SUBIR DOCUMENTOS
        |--------------------------------------------------------------------------
        */

        for (const idCampo in CAMPOS_ARCHIVO) {

            const input = document.getElementById(idCampo);

            const archivo = input.files[0];

            if (!archivo) {
                continue;
            }


            const nombreSeguro = archivo.name
                .replace(/[^a-zA-Z0-9._-]/g, "_");


            const rutaStorage =
                candidatoId +
                "/" +
                idCampo +
                "-" +
                nombreSeguro;


            const { error: errorSubida } =
                await window.supabaseClient
                    .storage
                    .from(BUCKET_DOCUMENTOS)
                    .upload(
                        rutaStorage,
                        archivo
                    );


            if (errorSubida) {
                throw errorSubida;
            }


            /*
            |--------------------------------------------------------------------------
            | 9. GUARDAR REGISTRO DEL DOCUMENTO
            |--------------------------------------------------------------------------
            */

            const { error: errorDocumento } =
                await window.supabaseClient
                    .from("documentos")
                    .insert({

                        candidato_id: candidatoId,

                        tipo_documento:
                            CAMPOS_ARCHIVO[idCampo],

                        nombre_archivo:
                            archivo.name,

                        ruta_storage:
                            rutaStorage

                    });


            if (errorDocumento) {
                throw errorDocumento;
            }
        }


        /*
        |--------------------------------------------------------------------------
        | 10. ÉXITO
        |--------------------------------------------------------------------------
        */

        alert(
            "¡Registro enviado correctamente!\n\n" +
            "Gracias por postularte a Trvely."
        );


        formulario.reset();


        document
            .querySelectorAll(".file-upload-btn")
            .forEach(function (btn) {

                btn.innerHTML =
                    '<span class="icono">⬆</span> Adjuntar archivo aquí';

                btn.classList.remove("tiene-archivo");
            });


    } catch (error) {

        console.error(error);

        alert(
            "Hubo un error al enviar el formulario:\n\n" +
            (error.message || "Intenta de nuevo.")
        );

    } finally {

        boton.disabled = false;
        boton.textContent = textoOriginal;
    }

});
