'use client'

import { useState, useRef, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Eye } from 'lucide-react'
import { NOMBRES_PLANTILLAS, type PlantillaFactura } from '@/lib/factura-cliente-pdf'

interface VistaPreviaPlantillaProps {
  numero: string
  emisorReceptor: string
  nifContraparte: string | null
  fechaEmision: string
  baseImponible: number
  iva: number
  total: number
  tipo: string
  empresaNombre?: string
  empresaDireccion?: string
  empresaNif?: string
}

function formatEuro(cents: number): string {
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(cents / 100)
}

function PlantillaPreview({ plantilla, datos }: { plantilla: PlantillaFactura; datos: VistaPreviaPlantillaProps }) {
  const esGasto = datos.tipo === 'gasto'
  const titulo = esGasto ? 'FACTURA RECIBIDA' : 'FACTURA EMITIDA'
  const empresa = datos.empresaNombre || 'Mi Empresa S.L.'
  const direccion = datos.empresaDireccion || 'Calle Ejemplo 123, Madrid'
  const nifEmpresa = datos.empresaNif || 'B00000000'

  if (plantilla === 'moderno') {
    return (
      <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-4 rounded-lg">
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="flex justify-between items-center border-b-2 border-emerald-500 pb-3 mb-3">
            <div>
              <h3 className="text-lg font-bold text-emerald-600">{titulo}</h3>
              <p className="text-xs text-gray-500">Nº {datos.numero}</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-bold text-emerald-600">{empresa}</p>
              <p className="text-[10px] text-gray-500">{nifEmpresa}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 mb-3">
            <div className="bg-green-50 border-l-4 border-emerald-500 p-2 rounded-r">
              <p className="text-[9px] font-bold text-emerald-600 uppercase">{esGasto ? 'Proveedor' : 'Cliente'}</p>
              <p className="text-xs font-semibold">{datos.emisorReceptor}</p>
            </div>
            <div className="bg-green-50 border-l-4 border-emerald-500 p-2 rounded-r">
              <p className="text-[9px] font-bold text-emerald-600 uppercase">Fecha</p>
              <p className="text-xs font-semibold">{new Date(datos.fechaEmision).toLocaleDateString('es-ES')}</p>
            </div>
          </div>
          <div className="bg-emerald-500 text-white rounded-lg p-2 flex justify-between items-center">
            <span className="text-xs font-semibold">TOTAL</span>
            <span className="text-lg font-bold">{formatEuro(datos.total)}</span>
          </div>
        </div>
      </div>
    )
  }

  if (plantilla === 'minimalista') {
    return (
      <div className="bg-white p-6 rounded-lg border">
        <div className="mb-6">
          <h3 className="text-2xl font-light tracking-widest uppercase">{titulo}</h3>
          <div className="flex justify-between mt-1">
            <p className="text-xs text-gray-400">Nº {datos.numero}</p>
            <p className="text-xs text-gray-400">{new Date(datos.fechaEmision).toLocaleDateString('es-ES')}</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-8 mb-6">
          <div>
            <p className="text-[8px] text-gray-400 uppercase tracking-widest mb-1">{esGasto ? 'Proveedor' : 'Cliente'}</p>
            <p className="text-sm font-semibold">{datos.emisorReceptor}</p>
          </div>
          <div>
            <p className="text-[8px] text-gray-400 uppercase tracking-widest mb-1">De</p>
            <p className="text-sm font-semibold">{empresa}</p>
            <p className="text-[10px] text-gray-500">{nifEmpresa}</p>
          </div>
        </div>
        <div className="text-right mb-6">
          <p className="text-[8px] text-gray-400 uppercase tracking-widest">Total a pagar</p>
          <p className="text-3xl font-light">{formatEuro(datos.total)}</p>
        </div>
        <div className="text-center text-[8px] text-gray-300 tracking-widest">{empresa.toUpperCase()}</div>
      </div>
    )
  }

  // Clásico
  return (
    <div className="bg-white p-4 rounded-lg border">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-lg font-bold">{titulo}</h3>
          <p className="text-xs text-gray-500">Nº {datos.numero}</p>
        </div>
        <div className="text-right">
          <p className="text-sm font-bold">{empresa}</p>
          <p className="text-[10px] text-gray-500">{direccion}</p>
          <p className="text-[10px] text-gray-500">NIF: {nifEmpresa}</p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-gray-50 rounded p-2">
          <p className="text-[9px] font-semibold text-gray-500 uppercase">{esGasto ? 'Proveedor' : 'Cliente'}</p>
          <p className="text-xs font-semibold">{datos.emisorReceptor}</p>
          {datos.nifContraparte && <p className="text-[10px] text-gray-500">NIF: {datos.nifContraparte}</p>}
        </div>
        <div className="bg-gray-50 rounded p-2">
          <p className="text-[9px] font-semibold text-gray-500 uppercase">Fecha</p>
          <p className="text-xs font-semibold">{new Date(datos.fechaEmision).toLocaleDateString('es-ES')}</p>
        </div>
      </div>
      <table className="w-full text-xs mb-3">
        <thead>
          <tr className="bg-gray-900 text-white">
            <th className="p-2 text-left">Concepto</th>
            <th className="p-2 text-right">Base</th>
            <th className="p-2 text-right">IVA</th>
            <th className="p-2 text-right">Total</th>
          </tr>
        </thead>
        <tbody>
          <tr className="border-b">
            <td className="p-2">{esGasto ? 'Gasto' : 'Servicio'}</td>
            <td className="p-2 text-right">{formatEuro(datos.baseImponible)}</td>
            <td className="p-2 text-right">{datos.iva}%</td>
            <td className="p-2 text-right font-semibold">{formatEuro(datos.total)}</td>
          </tr>
        </tbody>
      </table>
      <div className="bg-gray-100 p-2 rounded flex justify-between font-bold text-sm">
        <span>Total</span>
        <span>{formatEuro(datos.total)}</span>
      </div>
    </div>
  )
}

export function VistaPreviaPlantilla({ datos }: { datos: VistaPreviaPlantillaProps }) {
  const [plantilla, setPlantilla] = useState<PlantillaFactura>('clasico')

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">
          <Eye className="mr-1 h-3 w-3" /> Vista previa
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Vista previa de factura</DialogTitle>
        </DialogHeader>
        <div className="flex gap-2 mb-4">
          {(Object.entries(NOMBRES_PLANTILLAS) as Array<[PlantillaFactura, string]>).map(([k, v]) => (
            <Button
              key={k}
              variant={plantilla === k ? 'default' : 'outline'}
              size="sm"
              onClick={() => setPlantilla(k)}
            >
              {v}
            </Button>
          ))}
        </div>
        <PlantillaPreview plantilla={plantilla} datos={datos} />
      </DialogContent>
    </Dialog>
  )
}
