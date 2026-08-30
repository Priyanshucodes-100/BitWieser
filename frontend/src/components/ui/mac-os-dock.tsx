import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
} from 'react'

export interface DockApp {
  id: string
  name: string
  icon: string | ReactNode
}

export interface MacOSDockProps {
  apps: DockApp[]
  onAppClick: (appId: string) => void
  openApps?: string[]
  className?: string
}

function at<T>(list: T[], index: number, fallback: T): T {
  return list[index] ?? fallback
}

export function MacOSDock({
  apps,
  onAppClick,
  openApps = [],
  className = '',
}: MacOSDockProps) {
  const [mouseX, setMouseX] = useState<number | null>(null)
  const [currentScales, setCurrentScales] = useState<number[]>(() => apps.map(() => 1))
  const [currentPositions, setCurrentPositions] = useState<number[]>([])
  const dockRef = useRef<HTMLDivElement>(null)
  const iconRefs = useRef<Array<HTMLButtonElement | null>>([])
  const animationFrameRef = useRef<number | undefined>(undefined)
  const lastMouseMoveTime = useRef(0)

  const getResponsiveConfig = useCallback(() => {
    if (typeof window === 'undefined') {
      return { baseIconSize: 36, maxScale: 1.28, effectWidth: 140 }
    }

    const smallerDimension = Math.min(window.innerWidth, window.innerHeight)

    if (smallerDimension < 480) {
      return {
        baseIconSize: 28,
        maxScale: 1.18,
        effectWidth: smallerDimension * 0.32,
      }
    }
    if (smallerDimension < 768) {
      return {
        baseIconSize: 32,
        maxScale: 1.22,
        effectWidth: smallerDimension * 0.28,
      }
    }
    return {
      baseIconSize: 36,
      maxScale: 1.28,
      effectWidth: 150,
    }
  }, [])

  const [config, setConfig] = useState(getResponsiveConfig)
  const { baseIconSize, maxScale, effectWidth } = config
  const minScale = 1.0
  const baseSpacing = Math.max(4, baseIconSize * 0.08)

  useEffect(() => {
    const handleResize = () => setConfig(getResponsiveConfig())
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [getResponsiveConfig])

  const calculateTargetMagnification = useCallback(
    (mousePosition: number | null) => {
      if (mousePosition === null) {
        return apps.map(() => minScale)
      }

      return apps.map((_, index) => {
        const normalIconCenter = index * (baseIconSize + baseSpacing) + baseIconSize / 2
        const minX = mousePosition - effectWidth / 2
        const maxX = mousePosition + effectWidth / 2

        if (normalIconCenter < minX || normalIconCenter > maxX) {
          return minScale
        }

        const theta = ((normalIconCenter - minX) / effectWidth) * 2 * Math.PI
        const cappedTheta = Math.min(Math.max(theta, 0), 2 * Math.PI)
        const scaleFactor = (1 - Math.cos(cappedTheta)) / 2
        return minScale + scaleFactor * (maxScale - minScale)
      })
    },
    [apps, baseIconSize, baseSpacing, effectWidth, maxScale, minScale],
  )

  const calculatePositions = useCallback(
    (scales: number[]) => {
      let currentX = 0
      return scales.map((scale) => {
        const scaledWidth = baseIconSize * scale
        const centerX = currentX + scaledWidth / 2
        currentX += scaledWidth + baseSpacing
        return centerX
      })
    },
    [baseIconSize, baseSpacing],
  )

  useEffect(() => {
    const initialScales = apps.map(() => minScale)
    setCurrentScales(initialScales)
    setCurrentPositions(calculatePositions(initialScales))
  }, [apps, calculatePositions, minScale, config])

  const animateToTarget = useCallback(() => {
    const targetScales = calculateTargetMagnification(mouseX)
    const targetPositions = calculatePositions(targetScales)
    const lerpFactor = mouseX !== null ? 0.2 : 0.12

    setCurrentScales((prevScales) =>
      prevScales.map((currentScale, index) => {
        const diff = at(targetScales, index, minScale) - currentScale
        return currentScale + diff * lerpFactor
      }),
    )

    setCurrentPositions((prevPositions) =>
      prevPositions.map((currentPos, index) => {
        const diff = at(targetPositions, index, currentPos) - currentPos
        return currentPos + diff * lerpFactor
      }),
    )

    const scalesNeedUpdate = currentScales.some(
      (scale, index) => Math.abs(scale - at(targetScales, index, minScale)) > 0.002,
    )
    const positionsNeedUpdate = currentPositions.some(
      (pos, index) => Math.abs(pos - at(targetPositions, index, pos)) > 0.1,
    )

    if (scalesNeedUpdate || positionsNeedUpdate || mouseX !== null) {
      animationFrameRef.current = requestAnimationFrame(animateToTarget)
    }
  }, [mouseX, calculateTargetMagnification, calculatePositions, currentScales, currentPositions, minScale])

  useEffect(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
    }
    animationFrameRef.current = requestAnimationFrame(animateToTarget)
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [animateToTarget])

  const handleMouseMove = useCallback(
    (e: MouseEvent<HTMLDivElement>) => {
      const now = performance.now()
      if (now - lastMouseMoveTime.current < 16) return
      lastMouseMoveTime.current = now
      if (dockRef.current) {
        const rect = dockRef.current.getBoundingClientRect()
        const pad = Math.max(8, baseIconSize * 0.12)
        setMouseX(e.clientX - rect.left - pad)
      }
    },
    [baseIconSize],
  )

  const handleMouseLeave = useCallback(() => {
    setMouseX(null)
  }, [])

  const createBounceAnimation = (element: HTMLElement) => {
    const bounceHeight = Math.max(-8, -baseIconSize * 0.15)
    element.style.transition = 'transform 0.2s ease-out'
    element.style.transform = `translateY(${bounceHeight}px)`
    window.setTimeout(() => {
      element.style.transform = 'translateY(0px)'
    }, 200)
  }

  const handleAppClick = (appId: string, index: number) => {
    const el = iconRefs.current[index]
    if (el) createBounceAnimation(el)
    onAppClick(appId)
  }

  const contentWidth =
    currentPositions.length > 0
      ? Math.max(
          ...currentPositions.map(
            (pos, index) => pos + (baseIconSize * at(currentScales, index, 1)) / 2,
          ),
        )
      : apps.length * (baseIconSize + baseSpacing) - baseSpacing

  const padding = Math.max(5, baseIconSize * 0.1)
  const padY = Math.max(5, baseIconSize * 0.08)

  return (
    <div
      ref={dockRef}
      className={`backdrop-blur-xl ${className}`}
      style={{
        width: `${contentWidth + padding * 2}px`,
        background: 'rgba(0, 128, 128, 0.92)',
        borderRadius: 18,
        border: '1px solid rgba(245, 245, 220, 0.35)',
        boxShadow: `
          0 8px 24px rgba(0, 92, 92, 0.22),
          inset 0 1px 0 rgba(245, 245, 220, 0.28)
        `,
        padding: `${padY}px ${padding}px ${padY + 6}px`,
      }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      <div className="relative" style={{ height: `${baseIconSize}px`, width: '100%' }}>
        {apps.map((app, index) => {
          const scale = at(currentScales, index, 1)
          const position = at(currentPositions, index, 0)
          const scaledSize = baseIconSize * scale

          return (
            <button
              key={app.id}
              type="button"
              ref={(el) => {
                iconRefs.current[index] = el
              }}
              className="group absolute flex cursor-pointer flex-col items-center justify-end border-0 bg-transparent p-0"
              aria-label={app.name}
              title={app.name}
              onClick={() => handleAppClick(app.id, index)}
              onKeyDown={(e: KeyboardEvent<HTMLButtonElement>) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  handleAppClick(app.id, index)
                }
              }}
              style={{
                left: `${position - scaledSize / 2}px`,
                bottom: '0px',
                width: `${scaledSize}px`,
                height: `${scaledSize}px`,
                transformOrigin: 'bottom center',
                zIndex: Math.round(scale * 10),
              }}
            >
              <span className="pointer-events-none absolute -top-7 left-1/2 z-20 -translate-x-1/2 rounded-md bg-teal px-2 py-0.5 text-[10px] font-medium whitespace-nowrap text-[#F5F5DC] opacity-0 shadow-md transition-opacity group-hover:opacity-100">
                {app.name}
              </span>
              {typeof app.icon === 'string' ? (
                <img
                  src={app.icon}
                  alt=""
                  width={scaledSize}
                  height={scaledSize}
                  className="object-contain"
                  draggable={false}
                  style={{
                    filter: `drop-shadow(0 ${scale > 1.2 ? Math.max(2, baseIconSize * 0.05) : Math.max(1, baseIconSize * 0.03)}px ${scale > 1.2 ? Math.max(4, baseIconSize * 0.1) : Math.max(2, baseIconSize * 0.06)}px rgba(0,0,0,${0.2 + (scale - 1) * 0.15}))`,
                  }}
                />
              ) : (
                <div
                  className="h-full w-full"
                  style={{
                    filter: `drop-shadow(0 ${scale > 1.2 ? Math.max(2, baseIconSize * 0.05) : Math.max(1, baseIconSize * 0.03)}px ${scale > 1.2 ? Math.max(4, baseIconSize * 0.1) : Math.max(2, baseIconSize * 0.06)}px rgba(0,0,0,${0.2 + (scale - 1) * 0.15}))`,
                  }}
                >
                  {app.icon}
                </div>
              )}
              {openApps.includes(app.id) ? (
                <span
                  className="absolute"
                  style={{
                    bottom: `${Math.max(-2, -baseIconSize * 0.05)}px`,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    width: `${Math.max(3, baseIconSize * 0.06)}px`,
                    height: `${Math.max(3, baseIconSize * 0.06)}px`,
                    borderRadius: '50%',
                    backgroundColor: '#F5F5DC',
                    boxShadow: 'none',
                  }}
                />
              ) : null}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export default MacOSDock
