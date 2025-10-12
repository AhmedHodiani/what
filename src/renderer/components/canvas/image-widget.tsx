import type { ImageObject, DrawingObject } from 'lib/types/canvas'
import { WidgetWrapper } from './widgets/widget-wrapper'

interface ImageWidgetProps {
  object: ImageObject & { _imageUrl?: string }
  isSelected: boolean
  zoom: number
  onUpdate: (id: string, updates: Partial<DrawingObject>) => void
  onSelect: (id: string) => void
  onContextMenu: (event: React.MouseEvent, id: string) => void
  onStartDrag: (e: React.MouseEvent, id: string) => void
  getImageUrl: (assetId: string) => string
}

/**
 * ImageWidget - Simplified using WidgetWrapper
 * Now only 20 lines instead of 200! 🎉
 */
export function ImageWidget({ 
  object: image, 
  getImageUrl, 
  ...wrapperProps 
}: ImageWidgetProps) {
  const imageUrl = getImageUrl(image.object_data.assetId)

  return (
    <WidgetWrapper 
      object={image} 
      {...wrapperProps}
      isResizable={true}
      minWidth={100}
      minHeight={100}
    >
      <div 
        className="w-full h-full bg-cover bg-center bg-no-repeat rounded"
        style={{
          backgroundImage: imageUrl ? `url(${imageUrl})` : 'none',
        }}
      />
    </WidgetWrapper>
  )
}
