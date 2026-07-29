import { colors, type Colors } from "./colors";
import { gradients, type Gradients } from "./gradients";
import { radius, spacing, type Radius, type Spacing } from "./spacing";
import { typography, type Typography } from "./typography";

export type Theme = Readonly<{
  colors: Colors;
  gradients: Gradients;
  radius: Radius;
  spacing: Spacing;
  typography: Typography;
}>;

/** The one assembled token surface every component reads. */
export const theme: Theme = Object.freeze({ colors, gradients, radius, spacing, typography });
