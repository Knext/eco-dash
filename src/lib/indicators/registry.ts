/**
 * Plugin registry — the central source of truth for indicators.
 *
 * Adding a new indicator:
 *   1. Create src/lib/indicators/<ID>/index.ts that default-exports an
 *      IndicatorPlugin (def + fetcher, optional card / detail).
 *   2. Add one `import` line below and append the symbol to the
 *      PLUGINS array.
 *   3. (Optional) Custom card/detail renderers live in
 *      src/components/indicators/<ID>/.
 *
 * Each indicator lives in exactly one folder under src/lib/indicators/.
 * Removing an indicator = delete the folder + the two lines below.
 */
import type { IndicatorDef, IndicatorPlugin } from './types'

import VIXCLS from './VIXCLS'
import MOVE from './MOVE'
import CPIAUCSL from './CPIAUCSL'
import CPILFESL from './CPILFESL'
import PPIACO from './PPIACO'
import T10YIE from './T10YIE'
import DFF from './DFF'
import DGS3MO from './DGS3MO'
import DGS2 from './DGS2'
import DGS3 from './DGS3'
import DGS10 from './DGS10'
import DGS30 from './DGS30'
import T10Y2Y from './T10Y2Y'
import T10Y3M from './T10Y3M'
import KR_BASE_RATE from './KR_BASE_RATE'
import KR_10Y from './KR_10Y'
import BAMLH0A0HYM2 from './BAMLH0A0HYM2'
import DTWEXBGS from './DTWEXBGS'
import DCOILWTICO from './DCOILWTICO'
import GOLD from './GOLD'
import SILVER from './SILVER'
import COPPER from './COPPER'
import URANIUM from './URANIUM'
import KR_EXPORT from './KR_EXPORT'
import KR_EXPORT_SEMI from './KR_EXPORT_SEMI'
import KR_TB from './KR_TB'
import USDKRW from './USDKRW'
import EURKRW from './EURKRW'
import JPYKRW from './JPYKRW'
import USDJPY from './USDJPY'
import KOSPI from './KOSPI'
import KOSPI_PBR from './KOSPI_PBR'
import KOSPI_PER from './KOSPI_PER'
import SP500 from './SP500'

const PLUGINS: readonly IndicatorPlugin[] = [
  VIXCLS,
  MOVE,
  CPIAUCSL,
  CPILFESL,
  PPIACO,
  T10YIE,
  DFF,
  DGS3MO,
  DGS2,
  DGS3,
  DGS10,
  DGS30,
  T10Y2Y,
  T10Y3M,
  KR_BASE_RATE,
  KR_10Y,
  BAMLH0A0HYM2,
  DTWEXBGS,
  DCOILWTICO,
  GOLD,
  SILVER,
  COPPER,
  URANIUM,
  KR_EXPORT,
  KR_EXPORT_SEMI,
  KR_TB,
  USDKRW,
  EURKRW,
  JPYKRW,
  USDJPY,
  KOSPI,
  KOSPI_PBR,
  KOSPI_PER,
  SP500,
]

const PLUGIN_BY_ID = new Map<string, IndicatorPlugin>(PLUGINS.map((p) => [p.def.id, p]))

/** All registered indicator plugins, in registration order. */
export const INDICATOR_PLUGINS: readonly IndicatorPlugin[] = PLUGINS

/** All indicator definitions, in registration order. */
export const INDICATORS: readonly IndicatorDef[] = PLUGINS.map((p) => p.def)

export function getPlugin(id: string): IndicatorPlugin | undefined {
  return PLUGIN_BY_ID.get(id)
}

export function getIndicator(id: string): IndicatorDef | undefined {
  return PLUGIN_BY_ID.get(id)?.def
}

export const MAIN_VIEW_INDICATORS: readonly string[] = INDICATORS.filter(
  (i) => i.mainView,
).map((i) => i.id)

export const ALL_INDICATOR_IDS: readonly string[] = INDICATORS.map((i) => i.id)
