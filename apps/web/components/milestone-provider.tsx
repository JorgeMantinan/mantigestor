'use client'

import dynamic from 'next/dynamic'

const MilestoneDialog = dynamic(
  () => import('@/components/milestone-dialog').then(mod => mod.MilestoneDialog),
  { ssr: false }
)

export function MilestoneProvider() {
  return <MilestoneDialog />
}
