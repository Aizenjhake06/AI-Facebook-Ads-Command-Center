import { forwardRef, HTMLAttributes } from 'react'
import { LucideIcon, TrendingUp, TrendingDown } from 'lucide-react'
import { Card } from './Card'
import { cn, formatMetric } from '@/lib/design-system'

interface MetricCardProps extends HTMLAttributes<HTMLDivElement> {
  title: string
  value: number | string
  change?: number
  changeLabel?: string
  icon?: LucideIcon
  iconColor?: 'blue' | 'green' | 'yellow' | 'purple' | 'red'
  valueType?: 'number' | 'currency' | 'percentage'
  loading?: boolean
}

export const MetricCard = forwardRef<HTMLDivElement, MetricCardProps>(
  (
    {
      className,
      title,
      value,
      change,
      changeLabel,
      icon: Icon,
      iconColor = 'blue',
      valueType = 'number',
      loading = false,
      ...props
    },
    ref
  ) => {
    const iconColors = {
      blue: 'text-blue-400 bg-blue-500/10',
      green: 'text-green-400 bg-green-500/10',
      yellow: 'text-yellow-400 bg-yellow-500/10',
      purple: 'text-purple-400 bg-purple-500/10',
      red: 'text-red-400 bg-red-500/10',
    }

    const formattedValue = typeof value === 'number' ? formatMetric(value, valueType) : value

    return (
      <Card
        ref={ref}
        variant="elevated"
        padding="lg"
        hover
        className={cn('relative overflow-hidden group', className)}
        {...props}
      >
        {/* Background gradient effect */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600/5 to-purple-600/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        
        <div className="relative">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <p className="text-sm font-medium text-slate-400 mb-1">{title}</p>
              {loading ? (
                <div className="h-9 w-32 bg-slate-700/50 rounded animate-pulse" />
              ) : (
                <p className="text-3xl font-bold text-white tracking-tight">
                  {formattedValue}
                </p>
              )}
            </div>
            {Icon && (
              <div className={cn('p-3 rounded-xl', iconColors[iconColor])}>
                <Icon className="w-6 h-6" />
              </div>
            )}
          </div>

          {change !== undefined && (
            <div className="flex items-center gap-2">
              <div
                className={cn(
                  'flex items-center gap-1 text-sm font-medium',
                  change >= 0 ? 'text-green-400' : 'text-red-400'
                )}
              >
                {change >= 0 ? (
                  <TrendingUp className="w-4 h-4" />
                ) : (
                  <TrendingDown className="w-4 h-4" />
                )}
                <span>{Math.abs(change).toFixed(1)}%</span>
              </div>
              {changeLabel && (
                <span className="text-sm text-slate-500">{changeLabel}</span>
              )}
            </div>
          )}
        </div>
      </Card>
    )
  }
)

MetricCard.displayName = 'MetricCard'
