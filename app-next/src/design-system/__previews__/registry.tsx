import { previewNames } from './names';
import { PreviewDemo } from './PreviewDemo';
import { previewCopy } from '../../content/previews';
export const previews = previewNames.map((name) => ({
  name,
  variants: [
    {
      label: previewCopy.standard,
      element: <PreviewDemo key={`${name}-default`} name={name} alternate={false} />,
    },
    {
      label: previewCopy.alternate,
      element: <PreviewDemo key={`${name}-alternate`} name={name} alternate />,
    },
  ],
}));
