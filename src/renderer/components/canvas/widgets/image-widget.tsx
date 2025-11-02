import type { ImageObject, DrawingObject } from 'lib/types/canvas'
import { WidgetWrapper } from './widget-wrapper'
import { useWidgetCapabilities } from 'renderer/hooks'

interface ImageWidgetProps {
  object: ImageObject & { _imageUrl?: string }
  isSelected: boolean
  zoom: number
  onUpdate: (id: string, updates: Partial<DrawingObject>) => void
  onSelect: (id: string) => void
  onContextMenu: (event: React.MouseEvent, id: string) => void
  onStartDrag: (e: React.MouseEvent, id: string) => void
  getImageUrl: (assetId: string) => string
  tabId?: string | null // Parent canvas tab ID for opening external editor
}

/**
 * ImageWidget - Simplified using WidgetWrapper
 * Now with external-tab capability for full-screen viewing!
 */
export function ImageWidget({
  object: image,
  getImageUrl,
  tabId,
  ...wrapperProps
}: ImageWidgetProps) {
  const imageUrl = getImageUrl(image.object_data.assetId)
  
  // Get external-tab capability (for double-click to open full viewer)
  const { handleExternalTabOpen } = useWidgetCapabilities(
    'image',
    image,
    tabId || undefined
  )

  return (
    <WidgetWrapper
      object={image}
      {...wrapperProps}
      isResizable={true}
      minHeight={100}
      minWidth={100}
    >
      <div
        className="w-full h-full bg-cover bg-center bg-no-repeat rounded cursor-pointer"
        style={{
          backgroundImage: imageUrl ? `url(${imageUrl})` : 'none',
        }}
        onDoubleClick={handleExternalTabOpen}
      />
    </WidgetWrapper>
  )
}
