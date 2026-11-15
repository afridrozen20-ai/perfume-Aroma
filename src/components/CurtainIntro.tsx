import React from 'react';
import { IntroLogo } from './intro/IntroLogo';
import { IntroEditorial } from './intro/IntroEditorial';
import { IntroSplit } from './intro/IntroSplit';
import { IntroPlop } from './intro/IntroPlop';

export type IntroVariant = 'a' | 'b' | 'c' | 'd';

/** Opening animation. Variant chosen by the shop owner (preview: ?intro=a|b|c). */
export const CurtainIntro: React.FC<{ variant?: IntroVariant; onOpen: () => void; onDone: () => void }> = ({ variant = 'a', ...p }) =>
  variant === 'd' ? <IntroPlop {...p} /> : variant === 'b' ? <IntroEditorial {...p} /> : variant === 'c' ? <IntroSplit {...p} /> : <IntroLogo {...p} />;

export default CurtainIntro;
