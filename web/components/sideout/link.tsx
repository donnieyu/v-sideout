import type {ComponentProps} from 'react';
// Native document navigation preserves browser history without relying on
// vinext 1.0.0-beta.5's broken lazy navigateClientSide export in production.
export function SideoutLink(props:ComponentProps<'a'>){return <a {...props}/>}
