"use client"

import { useState, useRef } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import { createClient } from "@/lib/supabase/client"
import type { Space } from "@/lib/types"
import { Spinner } from "@/components/ui/spinner"
import { Upload, X, Image as ImageIcon } from "lucide-react"

interface SpaceSetupDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSpaceCreated: (space: Space) => void
  existingSpace?: Space | null
}

const BUILDING_TYPES = [
  { value: 'office', label: 'Office Building' },
  { value: 'retail', label: 'Retail Store' },
  { value: 'healthcare', label: 'Healthcare Facility' },
  { value: 'education', label: 'Educational Institution' },
  { value: 'hospitality', label: 'Hotel / Hospitality' },
  { value: 'industrial', label: 'Industrial / Warehouse' },
  { value: 'residential', label: 'Residential Building' },
  { value: 'mixed_use', label: 'Mixed Use' },
  { value: 'other', label: 'Other' },
]

export function SpaceSetupDialog({ open, onOpenChange, onSpaceCreated, existingSpace }: SpaceSetupDialogProps) {
  const supabase = createClient()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [formData, setFormData] = useState({
    name: existingSpace?.name || '',
    description: existingSpace?.description || '',
    address: existingSpace?.address || '',
    building_type: existingSpace?.building_type || 'office',
    total_area_sqft: existingSpace?.total_area_sqft?.toString() || '',
    floor_plan_url: existingSpace?.floor_plan_url || '',
    grid_resolution: existingSpace?.grid_resolution || 8,
  })

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    try {
      const formDataUpload = new FormData()
      formDataUpload.append('file', file)

      const response = await fetch('/api/upload/floor-plan', {
        method: 'POST',
        body: formDataUpload,
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Upload failed')
      }

      const { url } = await response.json()
      setFormData({ ...formData, floor_plan_url: url })
    } catch (error) {
      console.error('Error uploading floor plan:', error)
      alert(error instanceof Error ? error.message : 'Failed to upload floor plan')
    } finally {
      setUploading(false)
    }
  }

  const removeFloorPlan = () => {
    setFormData({ ...formData, floor_plan_url: '' })
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    const spaceData = {
      name: formData.name,
      description: formData.description || null,
      address: formData.address || null,
      building_type: formData.building_type,
      total_area_sqft: formData.total_area_sqft ? parseInt(formData.total_area_sqft) : null,
      floor_plan_url: formData.floor_plan_url || null,
      grid_resolution: formData.grid_resolution,
    }

    if (existingSpace) {
      const { data, error } = await supabase
        .from('spaces')
        .update(spaceData)
        .eq('id', existingSpace.id)
        .select()
        .single()

      if (data && !error) {
        onSpaceCreated(data)
      }
    } else {
      const { data, error } = await supabase
        .from('spaces')
        .insert(spaceData)
        .select()
        .single()

      if (data && !error) {
        onSpaceCreated(data)
      }
    }

    setLoading(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{existingSpace ? 'Edit Space' : 'Set Up Your Space'}</DialogTitle>
          <DialogDescription>
            {existingSpace 
              ? 'Update your space configuration and floor plan'
              : 'Upload a floor plan and configure your space. This helps our AI agents understand your environment.'
            }
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Floor Plan Upload */}
          <div className="space-y-2">
            <Label>Floor Plan Image</Label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/jpg,image/webp"
              onChange={handleFileSelect}
              className="hidden"
            />
            
            {formData.floor_plan_url ? (
              <div className="relative rounded-lg border border-border overflow-hidden">
                <img
                  src={formData.floor_plan_url}
                  alt="Floor plan preview"
                  className="w-full h-40 object-contain bg-muted/30"
                />
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  className="absolute top-2 right-2 h-8 w-8"
                  onClick={removeFloorPlan}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-border rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 hover:bg-muted/30 transition-colors"
              >
                {uploading ? (
                  <div className="flex flex-col items-center gap-2">
                    <Spinner className="h-8 w-8" />
                    <span className="text-sm text-muted-foreground">Uploading...</span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                      <ImageIcon className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <div>
                      <span className="text-sm font-medium">Upload floor plan</span>
                      <p className="text-xs text-muted-foreground mt-1">
                        PNG, JPEG, or WebP (max 10MB)
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Grid Resolution Slider */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Grid Resolution</Label>
              <span className="text-sm text-muted-foreground">{formData.grid_resolution} x {formData.grid_resolution}</span>
            </div>
            <Slider
              value={[formData.grid_resolution]}
              onValueChange={(value) => setFormData({ ...formData, grid_resolution: value[0] })}
              min={4}
              max={32}
              step={1}
              className="w-full"
            />
            <p className="text-xs text-muted-foreground">
              Higher resolution allows for more precise zone placement
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">Space Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Main Office Building"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="building_type">Building Type</Label>
            <Select
              value={formData.building_type}
              onValueChange={(value) => setFormData({ ...formData, building_type: value })}
            >
              <SelectTrigger id="building_type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {BUILDING_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Address</Label>
            <Input
              id="address"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              placeholder="123 Main Street, City"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="total_area_sqft">Total Area (sq ft)</Label>
            <Input
              id="total_area_sqft"
              type="number"
              value={formData.total_area_sqft}
              onChange={(e) => setFormData({ ...formData, total_area_sqft: e.target.value })}
              placeholder="e.g., 10000"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Describe your space, its purpose, and what insights you&apos;re looking for..."
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            {existingSpace && (
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
            )}
            <Button type="submit" disabled={loading || !formData.name}>
              {loading && <Spinner className="mr-2 h-4 w-4" />}
              {existingSpace ? 'Save Changes' : 'Create Space'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
