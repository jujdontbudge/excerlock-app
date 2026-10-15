# Shop

`ShopScreen.tsx` is the functional Shop route. It reads the public Bank API and confirms an Offer with a second tap. Affordability uses collected Points, and the remaining activity hint accounts for pending Points. Without an enabled Bank Condition the route returns Home.

The Points hero and the four `OfferCard`s come from the `ui` reward kit. A bought Offer flies a "+3 h" chip to the Home tab icon (`FlyToTargetProvider` wraps the tabs layout); buying from an empty Bank plays the `unlock` haptic, because that purchase lifts the Shield.
