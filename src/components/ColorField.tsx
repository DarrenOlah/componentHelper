// Reusable color picker: Army-brand preset swatches + a custom hex field +
// a native color picker. Used for both drawer colors (tab/background, ink).

export interface ArmyColor {
  name: string
  hex: string
  // Contrasting text color to pair with this color when used as a tab background.
  text: string
}

// The Army University brand palette. Order matters — it's the swatch row order.
// `text` is the legible label color over that background (per brand guidance).
export const ARMY_COLORS: ArmyColor[] = [
  { name: 'Civilian Blue', hex: '#B4CFED', text: '#000000' },
  { name: 'NCO Green', hex: '#087F47', text: '#FFFFFF' },
  { name: 'Warrant Officer Brown', hex: '#804331', text: '#FFFFFF' },
  { name: 'Command Blue', hex: '#00427E', text: '#FFFFFF' },
  { name: 'Army Gold', hex: '#FFCC33', text: '#000000' },
  { name: 'Army Black', hex: '#000000', text: '#FFFFFF' },
  { name: 'Carlisle Slate', hex: '#72848D', text: '#FFFFFF' },
  { name: 'White', hex: '#FFFFFF', text: '#000000' },
]

const HEX_RE = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/

function presetName(value: string): string {
  const v = value.trim().toLowerCase()
  return ARMY_COLORS.find(c => c.hex.toLowerCase() === v)?.name ?? 'Custom'
}

// The brand-paired text color for a tab background, or undefined if the value
// isn't a known preset (then the caller keeps the user's current text color).
export function tabTextFor(hex: string): string | undefined {
  const v = hex.trim().toLowerCase()
  return ARMY_COLORS.find(c => c.hex.toLowerCase() === v)?.text
}

interface ColorFieldProps {
  label: string
  value: string
  onChange: (hex: string) => void
  defaultValue: string
}

export function ColorField({ label, value, onChange, defaultValue }: ColorFieldProps) {
  const isValidHex = HEX_RE.test(value.trim())
  const active = value.trim().toLowerCase()
  const isDefault = active === defaultValue.trim().toLowerCase()

  return (
    <div className="mb-3 last:mb-0">
      <fieldset>
        <legend className="text-xs font-medium text-gray-700 mb-1">
          {label}
          <span className="ml-1 text-gray-500 font-normal">— {presetName(value)}</span>
        </legend>

        <div className="flex flex-wrap items-center gap-1.5 mb-2">
          {ARMY_COLORS.map(c => {
            const selected = c.hex.toLowerCase() === active
            return (
              <button
                key={c.hex}
                type="button"
                aria-label={c.name}
                aria-pressed={selected}
                title={`${c.name} (${c.hex})`}
                onClick={() => onChange(c.hex)}
                className={`w-6 h-6 rounded border transition-all ${
                  selected
                    ? 'border-gray-800 ring-2 ring-offset-1 ring-blue-500 scale-110'
                    : 'border-gray-300 hover:border-gray-500'
                }`}
                style={{ backgroundColor: c.hex }}
              />
            )
          })}
          {!isDefault && (
            <button
              type="button"
              onClick={() => onChange(defaultValue)}
              aria-label={`Reset ${label} to default`}
              title="Reset to default"
              className="ml-0.5 w-6 h-6 flex items-center justify-center rounded border border-gray-300 text-gray-500 hover:border-gray-500 hover:text-gray-700"
            >
              ↺
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <input
            type="text"
            value={value}
            onChange={e => onChange(e.target.value)}
            placeholder="#RRGGBB"
            spellCheck={false}
            aria-label={`${label} custom hex color`}
            aria-invalid={!isValidHex}
            className={`flex-1 min-w-0 px-2 py-1 border rounded text-xs font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              isValidHex ? 'border-gray-300' : 'border-red-400'
            }`}
          />
          <input
            type="color"
            value={isValidHex ? value : '#000000'}
            onChange={e => onChange(e.target.value)}
            aria-label={`Pick a custom ${label} color`}
            className="w-8 h-8 rounded border border-gray-300 cursor-pointer"
          />
        </div>
      </fieldset>
    </div>
  )
}
