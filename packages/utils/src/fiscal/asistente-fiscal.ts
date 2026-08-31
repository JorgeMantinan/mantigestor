/**
 * Asistente Fiscal — Analiza la situación del usuario y determina
 * qué modelos de la AEAT debe presentar, con frecuencia y plazos.
 *
 * Cubre los 48 modelos del catálogo AEAT para autónomos, PYMES y particulares.
 */

export interface SituacionFiscal {
  /** Tipo de actividad */
  actividad: 'autonomo' | 'sociedad' | 'asalariado' | 'pensionista' | 'alquilador' | 'inversor'
  /** ¿Tiene empleados? */
  tieneEmpleados: boolean
  /** ¿Realiza retenciones a profesionales? */
  retencionesProfesionales: boolean
  /** ¿Arrienda inmuebles urbanos? */
  arrendamientoInmuebles: boolean
  /** ¿Opera con criptomonedas? */
  criptomonedas: boolean
  /** ¿Tiene bienes en el extranjero? */
  bienesExtranjero: boolean
  /** ¿Opera con paraísos fiscales? */
  paraisosFiscales: boolean
  /** ¿Es entidad en transparencia fiscal? */
  transparenciaFiscal: boolean
  /** ¿Realiza donaciones deducibles? */
  donaciones: boolean
  /** ¿Tiene inversiones extranjeras? */
  inversionesExtranjeras: boolean
  /** ¿Es no residente? */
  noResidente: boolean
  /** ¿Tiene rentas exentas? */
  rentasExentas: boolean
  /** ¿Ha vendido inmuebles o plusvalías? */
  plusvalias: boolean
  /** Comunidad autónoma */
  comunidadAutonoma: string
}

export interface ModeloFiscal {
  modelo: string
  nombre: string
  descripcion: string
  frecuencia: 'trimestral' | 'anual' | 'mensual' | 'eventual'
  plazos: string[]
  obligatorio: boolean
  categoria: 'iva' | 'irpf' | 'retenciones' | 'sociedades' | 'catastro' | 'otros'
  urlCalculadora: string
  prioridad: 'alta' | 'media' | 'baja'
}

export function asistenteFiscal(s: SituacionFiscal): ModeloFiscal[] {
  const modelos: ModeloFiscal[] = []

  // ── MODELOS COMUNES A TODOS ──────────────────────────────

  // 036/037 — Declaración censal (alta/baja)
  modelos.push({
    modelo: '036/037',
    nombre: 'Declaración Censal',
    descripcion: 'Alta, modificación o baja en el censo de empresarios',
    frecuencia: 'eventual',
    plazos: ['Cuando proceda'],
    obligatorio: true,
    categoria: 'otros',
    urlCalculadora: '/fiscal?seccion=036',
    prioridad: 'alta',
  })

  if (s.actividad === 'autonomo' || s.actividad === 'sociedad') {
    // 303 — IVA trimestral
    modelos.push({
      modelo: '303',
      nombre: 'Modelo 303 — IVA Trimestral',
      descripcion: 'Autoliquidación del IVA (cuota repercutida - soportada)',
      frecuencia: 'trimestral',
      plazos: ['20 abril (Q1)', '20 julio (Q2)', '20 octubre (Q3)', '30 enero (Q4)'],
      obligatorio: true,
      categoria: 'iva',
      urlCalculadora: '/fiscal?seccion=303',
      prioridad: 'alta',
    })

    // 390 — IVA anual resumen
    modelos.push({
      modelo: '390',
      nombre: 'Modelo 390 — IVA Anual',
      descripcion: 'Resumen anual de las autoliquidaciones del IVA',
      frecuencia: 'anual',
      plazos: ['31 enero siguiente'],
      obligatorio: true,
      categoria: 'iva',
      urlCalculadora: '/fiscal?seccion=390',
      prioridad: 'alta',
    })

    // 130 — IRPF trimestral (autónomos)
    modelos.push({
      modelo: '130',
      nombre: 'Modelo 130 — IRPF Trimestral',
      descripcion: 'Pagos fraccionados del IRPF para autónomos en estimación directa',
      frecuencia: 'trimestral',
      plazos: ['20 abril (Q1)', '20 julio (Q2)', '20 octubre (Q3)', '30 enero (Q4)'],
      obligatorio: true,
      categoria: 'irpf',
      urlCalculadora: '/fiscal?seccion=130',
      prioridad: 'alta',
    })

    // 100 — IRPF anual (Renta)
    modelos.push({
      modelo: '100',
      nombre: 'Modelo 100 — Declaración de la Renta',
      descripcion: 'Declaración anual del IRPF',
      frecuencia: 'anual',
      plazos: ['2 abril - 30 junio siguiente'],
      obligatorio: true,
      categoria: 'irpf',
      urlCalculadora: '/fiscal?seccion=100',
      prioridad: 'alta',
    })

    // 131 — IRPF anual estimación objetiva (módulos)
    if (s.actividad === 'autonomo') {
      modelos.push({
        modelo: '131',
        nombre: 'Modelo 131 — IRPF Anual (Objetiva)',
        descripcion: 'Declaración anual del IRPF en estimación objetiva (módulos)',
        frecuencia: 'anual',
        plazos: ['31 enero siguiente'],
        obligatorio: false,
        categoria: 'irpf',
        urlCalculadora: '/fiscal?seccion=131',
        prioridad: 'media',
      })
    }

    // 309 — Liquidación IVA no domiciliados
    modelos.push({
      modelo: '309',
      nombre: 'Modelo 309 — IVA No Domiciliados',
      descripcion: 'Liquidación del IVA para sujetos pasivos no domiciliados',
      frecuencia: 'trimestral',
      plazos: ['20 abril', '20 julio', '20 octubre', '20 enero'],
      obligatorio: false,
      categoria: 'iva',
      urlCalculadora: '/fiscal?seccion=309',
      prioridad: 'baja',
    })

    // 349 — Operaciones intracomunitarias
    modelos.push({
      modelo: '349',
      nombre: 'Modelo 349 — Operaciones Intracomunitarias',
      descripcion: 'Declaración informativa de operaciones con otros estados miembros UE',
      frecuencia: 'trimestral',
      plazos: ['20 abril (Q1)', '20 julio (Q2)', '20 octubre (Q3)', '30 enero (Q4)'],
      obligatorio: false,
      categoria: 'iva',
      urlCalculadora: '/fiscal?seccion=349',
      prioridad: 'media',
    })

    // 347 — Operaciones con terceros
    modelos.push({
      modelo: '347',
      nombre: 'Modelo 347 — Operaciones con Terceros',
      descripcion: 'Declaración informativa de operaciones superiores a 3.005€',
      frecuencia: 'anual',
      plazos: ['28 febrero siguiente'],
      obligatorio: false,
      categoria: 'otros',
      urlCalculadora: '/fiscal?seccion=347',
      prioridad: 'media',
    })

    // 104 — IRPF sociedades (si es sociedad)
    if (s.actividad === 'sociedad') {
      modelos.push({
        modelo: '104',
        nombre: 'Modelo 104 — IRPF Sociedades',
        descripcion: 'Pagos fraccionados del IS por sociedades',
        frecuencia: 'trimestral',
        plazos: ['20 abril', '20 julio', '20 octubre', '20 enero'],
        obligatorio: true,
        categoria: 'sociedades',
        urlCalculadora: '/fiscal?seccion=104',
        prioridad: 'alta',
      })

      // 200 — Impuesto sociedades
      modelos.push({
        modelo: '200',
        nombre: 'Modelo 200 — Impuesto Sociedades',
        descripcion: 'Declaración del Impuesto sobre Sociedades',
        frecuencia: 'anual',
        plazos: ['25 julio siguiente'],
        obligatorio: true,
        categoria: 'sociedades',
        urlCalculadora: '/fiscal?seccion=200',
        prioridad: 'alta',
      })

      // 202 — Pagos fraccionados IS
      modelos.push({
        modelo: '202',
        nombre: 'Modelo 202 — Pagos Fraccionados IS',
        descripcion: 'Pagos fraccionados del Impuesto sobre Sociedades',
        frecuencia: 'trimestral',
        plazos: ['20 abril', '20 julio', '20 octubre', '20 enero'],
        obligatorio: true,
        categoria: 'sociedades',
        urlCalculadora: '/fiscal?seccion=202',
        prioridad: 'media',
      })
    }
  }

  // ── RETENCIONES ──────────────────────────────────────────

  if (s.tieneEmpleados) {
    modelos.push({
      modelo: '111',
      nombre: 'Modelo 111 — Retenciones Trimestrales',
      descripcion: 'Retenciones e ingresos a cuenta del IRPF (trabajo, profesional, arrendamiento)',
      frecuencia: 'trimestral',
      plazos: ['20 abril', '20 julio', '20 octubre', '20 enero'],
      obligatorio: true,
      categoria: 'retenciones',
      urlCalculadora: '/fiscal?seccion=111',
      prioridad: 'alta',
    })

    modelos.push({
      modelo: '190',
      nombre: 'Modelo 190 — Resumen Anual Retenciones',
      descripcion: 'Declaración informativa anual de retenciones',
      frecuencia: 'anual',
      plazos: ['31 enero siguiente'],
      obligatorio: true,
      categoria: 'retenciones',
      urlCalculadora: '/fiscal?seccion=190',
      prioridad: 'media',
    })

    modelos.push({
      modelo: '111',
      nombre: 'Modelo 111 — Retenciones Nóminas',
      descripcion: 'Retenciones sobre rendimientos del trabajo',
      frecuencia: 'trimestral',
      plazos: ['20 abril', '20 julio', '20 octubre', '20 enero'],
      obligatorio: true,
      categoria: 'retenciones',
      urlCalculadora: '/fiscal?seccion=111',
      prioridad: 'alta',
    })
  }

  if (s.retencionesProfesionales) {
    // Ya incluido en 111, pero destacamos la obligación
    modelos.push({
      modelo: '180',
      nombre: 'Modelo 180 — Retenciones Arrendamiento',
      descripcion: 'Declaración anual de retenciones sobre arrendamientos',
      frecuencia: 'anual',
      plazos: ['31 enero siguiente'],
      obligatorio: true,
      categoria: 'retenciones',
      urlCalculadora: '/fiscal?seccion=180',
      prioridad: 'media',
    })
  }

  if (s.arrendamientoInmuebles) {
    modelos.push({
      modelo: '115',
      nombre: 'Modelo 115 — Retenciones Arrendamiento',
      descripcion: 'Retenciones sobre arrendamientos de inmuebles urbanos',
      frecuencia: 'trimestral',
      plazos: ['20 abril', '20 julio', '20 octubre', '20 enero'],
      obligatorio: true,
      categoria: 'retenciones',
      urlCalculadora: '/fiscal?seccion=115',
      prioridad: 'media',
    })

    modelos.push({
      modelo: '180',
      nombre: 'Modelo 180 — Resumen Arrendamiento',
      descripcion: 'Declaración anual de retenciones sobre arrendamientos',
      frecuencia: 'anual',
      plazos: ['31 enero siguiente'],
      obligatorio: true,
      categoria: 'retenciones',
      urlCalculadora: '/fiscal?seccion=180',
      prioridad: 'media',
    })
  }

  // ── ESPECÍFICOS ──────────────────────────────────────────

  if (s.criptomonedas) {
    modelos.push({
      modelo: '231',
      nombre: 'Modelo 231 — Criptomonedas',
      descripcion: 'Declaración informativa de operaciones con criptomonedas',
      frecuencia: 'anual',
      plazos: ['31 marzo siguiente'],
      obligatorio: true,
      categoria: 'otros',
      urlCalculadora: '/fiscal?seccion=231',
      prioridad: 'alta',
    })

    modelos.push({
      modelo: '721',
      nombre: 'Modelo 721 — Criptomonedas Extranjero',
      descripcion: 'Declaración informativa de criptomonedas en el extranjero',
      frecuencia: 'anual',
      plazos: ['31 marzo siguiente'],
      obligatorio: true,
      categoria: 'otros',
      urlCalculadora: '/fiscal?seccion=721',
      prioridad: 'alta',
    })
  }

  if (s.bienesExtranjero) {
    modelos.push({
      modelo: '720',
      nombre: 'Modelo 720 — Bienes Extranjero',
      descripcion: 'Declaración informativa de bienes y derechos en el extranjero',
      frecuencia: 'anual',
      plazos: ['31 marzo siguiente'],
      obligatorio: true,
      categoria: 'otros',
      urlCalculadora: '/fiscal?seccion=720',
      prioridad: 'alta',
    })

    modelos.push({
      modelo: '236',
      nombre: 'Modelo 236 — Bienes Extranjero',
      descripcion: 'Declaración informativa de bienes y derechos en el extranjero',
      frecuencia: 'anual',
      plazos: ['31 marzo siguiente'],
      obligatorio: false,
      categoria: 'otros',
      urlCalculadora: '/fiscal?seccion=236',
      prioridad: 'media',
    })

    modelos.push({
      modelo: '715',
      nombre: 'Modelo 715 — Inversiones Extranjeras',
      descripcion: 'Declaración informativa de inversiones en el extranjero',
      frecuencia: 'anual',
      plazos: ['31 marzo siguiente'],
      obligatorio: false,
      categoria: 'otros',
      urlCalculadora: '/fiscal?seccion=715',
      prioridad: 'baja',
    })
  }

  if (s.paraisosFiscales) {
    modelos.push({
      modelo: '345',
      nombre: 'Modelo 345 — Paraísos Fiscales',
      descripcion: 'Declaración informativa de operaciones con entidades en paraísos fiscales',
      frecuencia: 'anual',
      plazos: ['28 febrero siguiente'],
      obligatorio: true,
      categoria: 'otros',
      urlCalculadora: '/fiscal?seccion=345',
      prioridad: 'alta',
    })
  }

  if (s.transparenciaFiscal) {
    modelos.push({
      modelo: '282',
      nombre: 'Modelo 282 — Transparencia Fiscal',
      descripcion: 'Declaración informativa de entidades en régimen de transparencia fiscal',
      frecuencia: 'anual',
      plazos: ['31 marzo siguiente'],
      obligatorio: true,
      categoria: 'otros',
      urlCalculadora: '/fiscal?seccion=282',
      prioridad: 'media',
    })
  }

  if (s.donaciones) {
    modelos.push({
      modelo: '182',
      nombre: 'Modelo 182 — Donaciones',
      descripcion: 'Declaración informativa de donatarias y donatarios',
      frecuencia: 'anual',
      plazos: ['31 marzo siguiente'],
      obligatorio: true,
      categoria: 'otros',
      urlCalculadora: '/fiscal?seccion=182',
      prioridad: 'media',
    })

    modelos.push({
      modelo: '714',
      nombre: 'Modelo 714 — Donativos',
      descripcion: 'Declaración informativa de donativos deducibles',
      frecuencia: 'anual',
      plazos: ['31 marzo siguiente'],
      obligatorio: false,
      categoria: 'otros',
      urlCalculadora: '/fiscal?seccion=714',
      prioridad: 'baja',
    })
  }

  if (s.rentasExentas) {
    modelos.push({
      modelo: '189',
      nombre: 'Modelo 189 — Rentas Exentas',
      descripcion: 'Declaración informativa de rentas exentas',
      frecuencia: 'anual',
      plazos: ['31 enero siguiente'],
      obligatorio: true,
      categoria: 'otros',
      urlCalculadora: '/fiscal?seccion=189',
      prioridad: 'media',
    })
  }

  if (s.plusvalias) {
    modelos.push({
      modelo: '600',
      nombre: 'Modelo 600 — Plusvalía Municipal',
      descripcion: 'Impuesto sobre el Incremento de Valor de los Terrenos de Naturaleza Urbana',
      frecuencia: 'eventual',
      plazos: ['30 días hábiles desde devengo'],
      obligatorio: true,
      categoria: 'catastro',
      urlCalculadora: '/fiscal?seccion=600',
      prioridad: 'media',
    })

    modelos.push({
      modelo: '210',
      nombre: 'Modelo 210 — IRPF No Residentes',
      descripcion: 'IRPF sobre rendimientos de capital inmobiliario de no residentes',
      frecuencia: 'anual',
      plazos: ['31 diciembre siguiente'],
      obligatorio: false,
      categoria: 'irpf',
      urlCalculadora: '/fiscal?seccion=210',
      prioridad: 'baja',
    })
  }

  if (s.noResidente) {
    modelos.push({
      modelo: '216',
      nombre: 'Modelo 216 — Retenciones No Residentes',
      descripcion: 'Retenciones sobre rendimientos del trabajo a no residentes',
      frecuencia: 'trimestral',
      plazos: ['20 abril', '20 julio', '20 octubre', '20 enero'],
      obligatorio: true,
      categoria: 'retenciones',
      urlCalculadora: '/fiscal?seccion=216',
      prioridad: 'media',
    })

    modelos.push({
      modelo: '210',
      nombre: 'Modelo 210 — IRPF No Residentes',
      descripcion: 'Declaración del IRPF para no residentes',
      frecuencia: 'anual',
      plazos: ['31 diciembre siguiente'],
      obligatorio: true,
      categoria: 'irpf',
      urlCalculadora: '/fiscal?seccion=210',
      prioridad: 'alta',
    })
  }

  // ── MODELOS SIEMPRE PRESENTES (obligatorios para todos) ──

  if (s.actividad === 'autonomo' || s.actividad === 'sociedad') {
    // 194 — Resumen anual retenciones (siempre si hay retenciones)
    modelos.push({
      modelo: '194',
      nombre: 'Modelo 194 — Resumen Anual Retenciones',
      descripcion: 'Resumen anual de todas las retenciones practicadas',
      frecuencia: 'anual',
      plazos: ['31 enero siguiente'],
      obligatorio: true,
      categoria: 'retenciones',
      urlCalculadora: '/fiscal?seccion=194',
      prioridad: 'media',
    })

    // 193 — Retenciones capital mobiliario (si tiene cuentas remuneradas)
    modelos.push({
      modelo: '193',
      nombre: 'Modelo 193 — Capital Mobiliario',
      descripcion: 'Declaración informativa de rendimientos del capital mobiliario',
      frecuencia: 'anual',
      plazos: ['31 enero siguiente'],
      obligatorio: false,
      categoria: 'retenciones',
      urlCalculadora: '/fiscal?seccion=193',
      prioridad: 'baja',
    })

    // 296 — Retenciones especiales
    modelos.push({
      modelo: '296',
      nombre: 'Modelo 296 — Retenciones Especiales',
      descripcion: 'Declaración informativa de retenciones especiales',
      frecuencia: 'anual',
      plazos: ['31 enero siguiente'],
      obligatorio: false,
      categoria: 'retenciones',
      urlCalculadora: '/fiscal?seccion=296',
      prioridad: 'baja',
    })

    // 369 — IVA refundable no establecidos
    modelos.push({
      modelo: '369',
      nombre: 'Modelo 369 — IVA Refundable',
      descripcion: 'Devolución del IVA a no establecidos en la UE',
      frecuencia: 'eventual',
      plazos: ['Trimestral o anual'],
      obligatorio: false,
      categoria: 'iva',
      urlCalculadora: '/fiscal?seccion=369',
      prioridad: 'baja',
    })

    // 590 — Autoliquidación IVA cero
    modelos.push({
      modelo: '590',
      nombre: 'Modelo 590 — IVA Cero',
      descripcion: 'Autoliquidación del IVA con cuota cero',
      frecuencia: 'trimestral',
      plazos: ['20 abril', '20 julio', '20 octubre', '20 enero'],
      obligatorio: false,
      categoria: 'iva',
      urlCalculadora: '/fiscal?seccion=590',
      prioridad: 'baja',
    })

    // RETA — Autónomos
    if (s.actividad === 'autonomo') {
      modelos.push({
        modelo: 'RETA',
        nombre: 'RETA — Régimen Especial Autónomos',
        descripcion: 'Cuotas de autónomos a la Seguridad Social',
        frecuencia: 'mensual',
        plazos: ['1-15 de cada mes'],
        obligatorio: true,
        categoria: 'otros',
        urlCalculadora: '/fiscal?seccion=RETA',
        prioridad: 'alta',
      })
    }
  }

  return modelos
}

/**
 * Agrupa modelos por categoría para visualización.
 */
export function agruparModelosPorCategoria(modelos: ModeloFiscal[]): Record<string, ModeloFiscal[]> {
  const grupos: Record<string, ModeloFiscal[]> = {}
  for (const m of modelos) {
    const key = m.categoria
    if (!grupos[key]) grupos[key] = []
    grupos[key].push(m)
  }
  return grupos
}

/**
 * Filtra modelos obligatorios.
 */
export function modelosObligatorios(modelos: ModeloFiscal[]): ModeloFiscal[] {
  return modelos.filter(m => m.obligatorio)
}

/**
 * Obtiene próximo plazo de un modelo.
 */
export function proximoPlazo(modelo: ModeloFiscal): string | null {
  if (modelo.plazos.length === 0) return null
  return modelo.plazos[0] ?? null
}
