'use client'

import { useTransition } from 'react'
import { toggleActivo } from '@/app/actions/productos'

interface Props {
  id: string
  activo: boolean
}

export default function ToggleActivoProducto({ id, activo }: Props) {
  const [isPending, startTransition] = useTransition()

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    startTransition(async () => {
      await toggleActivo(id, e.target.checked)
    })
  }

  return (
    <label className="relative inline-flex items-center cursor-pointer">
      <input
        type="checkbox"
        checked={activo}
        onChange={handleChange}
        disabled={isPending}
        className="sr-only peer"
      />
      <div className={[
        'w-9 h-5 rounded-full transition-colors',
        'peer-checked:bg-[#7c3aed] bg-gray-200',
        isPending ? 'opacity-60' : '',
      ].join(' ')} />
      <div className={[
        'absolute left-0.5 top-0.5 w-4 h-4 bg-[var(--bg-card)] rounded-full shadow transition-transform',
        'peer-checked:translate-x-4',
      ].join(' ')} />
    </label>
  )
}
