Finance Tracker

Frontend UI Requirements Document

MVP Design Specifications

Version 3.0 \| November 2025

  -----------------------------------------------------------------------
  **Property**            **Value**
  ----------------------- -----------------------------------------------
  Document Type           Frontend UI Requirements Specification

  Application             Finance Tracker - Personal Finance Management

  Target Platforms        Web (Desktop, Tablet, Mobile), PWA

  Architecture            REST API - Request/Response Pattern

  Design Framework        Component-Based Design System

  Accessibility Standard  WCAG 2.1 Level AA Compliance

  Currency                BRL (Brazilian Real) - Single Currency

  Language                Portuguese (pt-BR) - Single Language

  Status                  MVP - Ready for Development
  -----------------------------------------------------------------------

Table of Contents

1\. Introduction

1.1 Document Purpose

This document provides comprehensive frontend user interface
requirements and design specifications for the Finance Tracker MVP
application. It serves as the authoritative reference for designers,
developers, and stakeholders to ensure consistent implementation of the
user experience across all platforms and devices.

1.2 Scope

This specification covers all visual elements, interaction patterns,
component behaviors, screen layouts, and accessibility requirements for
the Finance Tracker frontend application. It includes:

- Complete design system with tokens, components, and patterns

- Detailed screen-by-screen specifications with wireframe descriptions

- Component library with states, variants, and interaction behaviors

- Responsive design breakpoints and adaptation rules

- Animation and micro-interaction specifications

- Accessibility requirements and implementation guidelines

- Error handling, loading states, and edge cases

- Data refresh patterns using REST API

1.3 MVP Scope Decisions

This MVP version includes the following scope decisions:

- **Included:** Groups/Collaboration, Category Rules (regex with UI
  helper), Spending Limit Goals

- **Single Currency:** BRL (Brazilian Real) only - no multi-currency
  support

- **Single Language:** Portuguese (pt-BR) only - no internationalization

- **Authentication:** Email/password only - no social auth (Google,
  Apple)

- **Removed:** Dark mode, data export, avatar upload, push
  notifications, weekly summary emails, savings goals

- **Simplified:** 2-step import wizard, simplified filters, simplified
  settings

1.4 Architecture Note

This application uses a REST API architecture with standard
request/response patterns. There is no real-time synchronization or
WebSocket communication. Data updates are handled through:

- Manual refresh actions (pull-to-refresh, refresh button)

- Automatic refresh on navigation to screens

- Optimistic UI updates with server confirmation

1.5 Design Philosophy

The Finance Tracker UI is built on five core principles that guide all
design decisions:

1.  **Financial Clarity:** Complex financial data must be presented in
    digestible, scannable formats. Users should understand their
    financial position within seconds of viewing any screen.

2.  **Trust Through Design:** Every visual element should reinforce
    security and reliability. Professional aesthetics, consistent
    patterns, and polished interactions build user confidence.

3.  **Efficiency First:** Common tasks must require minimal interaction.
    Import a statement in 2 steps. Categorize a transaction in 2 clicks.
    View spending trends instantly.

4.  **Progressive Disclosure:** Show essential information immediately;
    reveal details on demand. Avoid overwhelming users while ensuring
    depth is always accessible.

5.  **Inclusive Design:** Every user, regardless of ability, device, or
    context, should have full access to all functionality. Accessibility
    is not an afterthought.

1.6 Target Users

Primary user personas that inform design decisions:

**Persona 1 - The Busy Professional:** Ages 28-45, limited time, wants
quick insights into spending. Uses primarily on mobile during commute.
Values efficiency and automation.

**Persona 2 - The Detail-Oriented Tracker:** Ages 35-55, enjoys
analyzing every transaction. Uses primarily on desktop. Values
comprehensive data and customization.

**Persona 3 - The Collaborative Family Manager:** Ages 30-50, manages
household finances with partner. Needs group features and shared
visibility.

2\. Design System Foundation

The design system establishes the foundational visual language ensuring
consistency across all interfaces. All values are defined as design
tokens for systematic implementation.

2.1 Design Tokens

2.1.1 Color Tokens

Primary brand colors establish the visual identity:

  -----------------------------------------------------------------------------
  **Token Name**         **Hex       **RGB**        **Usage**
                         Value**                    
  ---------------------- ----------- -------------- ---------------------------
  \--color-primary-50    #E8F4F8     232, 244, 248  Primary backgrounds, hover
                                                    states

  \--color-primary-100   #C5E4ED     197, 228, 237  Secondary backgrounds,
                                                    selected states

  \--color-primary-200   #9DD1E0     157, 209, 224  Borders, dividers on
                                                    primary

  \--color-primary-300   #6FBBD0     111, 187, 208  Icons on light backgrounds

  \--color-primary-400   #4AA5C0     74, 165, 192   Secondary buttons, links

  \--color-primary-500   #1A5F7A     26, 95, 122    Primary brand color, main
                                                    CTAs

  \--color-primary-600   #154D63     21, 77, 99     Hover state for primary

  \--color-primary-700   #0F4C5C     15, 76, 92     Active/pressed state

  \--color-primary-800   #0A3340     10, 51, 64     Text on light backgrounds

  \--color-primary-900   #052028     5, 32, 40      Headings, high emphasis
                                                    text
  -----------------------------------------------------------------------------

Semantic colors for status and feedback:

  -----------------------------------------------------------------------------
  **Token Name**         **Hex       **Purpose**    **Usage Examples**
                         Value**                    
  ---------------------- ----------- -------------- ---------------------------
  \--color-success-500   #22C55E     Positive       Income amounts, goal
                                     outcomes       achieved, success toasts

  \--color-success-50    #F0FDF4     Success        Success banners, positive
                                     background     highlights

  \--color-success-700   #15803D     Success        Success messages,
                                     text/icons     checkmarks

  \--color-error-500     #EF4444     Errors,        Expense amounts, validation
                                     expenses       errors, alerts

  \--color-error-50      #FEF2F2     Error          Error banners, form field
                                     background     errors

  \--color-error-700     #B91C1C     Error          Error messages, warning
                                     text/icons     icons

  \--color-warning-500   #F59E0B     Warnings,      Approaching limits, pending
                                     caution        states

  \--color-warning-50    #FFFBEB     Warning        Warning banners, limit
                                     background     alerts

  \--color-warning-700   #B45309     Warning        Warning messages, caution
                                     text/icons     icons

  \--color-info-500      #3B82F6     Information    Tips, help text,
                                                    informational alerts

  \--color-info-50       #EFF6FF     Info           Info banners, tooltips
                                     background     

  \--color-info-700      #1D4ED8     Info           Links, informational icons
                                     text/icons     
  -----------------------------------------------------------------------------

Neutral colors for text and backgrounds:

  ------------------------------------------------------------------------
  **Token Name**        **Hex Value**  **Usage**
  --------------------- -------------- -----------------------------------
  \--color-gray-50      #F9FAFB        Page backgrounds, card backgrounds

  \--color-gray-100     #F3F4F6        Secondary backgrounds, disabled
                                       backgrounds

  \--color-gray-200     #E5E7EB        Borders, dividers, input borders

  \--color-gray-300     #D1D5DB        Disabled text, placeholder borders

  \--color-gray-400     #9CA3AF        Placeholder text, disabled icons

  \--color-gray-500     #6B7280        Secondary text, captions, labels

  \--color-gray-600     #4B5563        Body text, descriptions

  \--color-gray-700     #374151        Emphasized body text

  \--color-gray-800     #1F2937        Headings, high-emphasis text

  \--color-gray-900     #111827        Primary text, titles

  \--color-white        #FFFFFF        Card surfaces, input backgrounds

  \--color-black        #000000        Overlays (with opacity)
  ------------------------------------------------------------------------

2.1.2 Typography Tokens

Font family stack with fallbacks:

**Primary Font:** \'Inter\', -apple-system, BlinkMacSystemFont, \'Segoe
UI\', Roboto, \'Helvetica Neue\', Arial, sans-serif

**Monospace Font:** \'JetBrains Mono\', \'SF Mono\', \'Fira Code\',
Consolas, \'Liberation Mono\', Menlo, monospace

Font size scale (using rem for accessibility):

  ---------------------------------------------------------------------------
  **Token**      **Size    **Size   **Line      **Letter    **Usage**
                 (rem)**   (px)**   Height**    Spacing**   
  -------------- --------- -------- ----------- ----------- -----------------
  \--text-xs     0.75      12       1.5 (18px)  0.02em      Badges,
                                                            timestamps, fine
                                                            print

  \--text-sm     0.875     14       1.43 (20px) 0.01em      Labels, captions,
                                                            helper text

  \--text-base   1         16       1.5 (24px)  0           Body text,
                                                            paragraphs,
                                                            inputs

  \--text-lg     1.125     18       1.56 (28px) -0.01em     Emphasized body,
                                                            card titles

  \--text-xl     1.25      20       1.4 (28px)  -0.01em     Section headers,
                                                            large labels

  \--text-2xl    1.5       24       1.33 (32px) -0.02em     Page titles, card
                                                            headers

  \--text-3xl    1.875     30       1.27 (38px) -0.02em     Major headings

  \--text-4xl    2.25      36       1.22 (44px) -0.03em     Display text,
                                                            hero amounts

  \--text-5xl    3         48       1.17 (56px) -0.03em     Large display
                                                            numbers
  ---------------------------------------------------------------------------

Font weight scale:

  ------------------------------------------------------------------------
  **Token**               **Weight**   **Usage**
  ----------------------- ------------ -----------------------------------
  \--font-normal          400          Body text, paragraphs, descriptions

  \--font-medium          500          Labels, buttons, emphasized text

  \--font-semibold        600          Subheadings, card titles,
                                       navigation items

  \--font-bold            700          Headings, important numbers, CTAs
  ------------------------------------------------------------------------

2.1.3 Spacing Tokens

4px base unit spacing scale:

  -----------------------------------------------------------------------
  **Token**         **Value**   **Usage Examples**
  ----------------- ----------- -----------------------------------------
  \--space-0        0px         Reset spacing

  \--space-0.5      2px         Hairline gaps, icon adjustments

  \--space-1        4px         Tight inline spacing, icon-to-text

  \--space-1.5      6px         Compact component padding

  \--space-2        8px         Standard inline gaps, small padding

  \--space-2.5      10px        Form field internal padding

  \--space-3        12px        Button padding, list item spacing

  \--space-4        16px        Standard component padding, card gaps

  \--space-5        20px        Medium section spacing

  \--space-6        24px        Card padding, major component gaps

  \--space-8        32px        Section spacing, large gaps

  \--space-10       40px        Major section margins

  \--space-12       48px        Page section spacing

  \--space-16       64px        Hero sections, major divisions

  \--space-20       80px        Extra large spacing

  \--space-24       96px        Maximum spacing for layouts
  -----------------------------------------------------------------------

2.1.4 Border Radius Tokens

  -----------------------------------------------------------------------
  **Token**             **Value**   **Usage**
  --------------------- ----------- -------------------------------------
  \--radius-none        0px         Square corners (rare)

  \--radius-sm          4px         Buttons, inputs, chips, tags

  \--radius-md          6px         Small cards, tooltips

  \--radius-lg          8px         Cards, modals, dropdowns

  \--radius-xl          12px        Large cards, floating panels

  \--radius-2xl         16px        Hero cards, featured content

  \--radius-full        9999px      Pills, avatars, circular buttons
  -----------------------------------------------------------------------

2.1.5 Shadow Tokens

  -----------------------------------------------------------------------
  **Token**         **Value**                       **Usage**
  ----------------- ------------------------------- ---------------------
  \--shadow-xs      0 1px 2px rgba(0,0,0,0.04)      Subtle elevation,
                                                    pressed states

  \--shadow-sm      0 1px 3px rgba(0,0,0,0.06), 0   Cards, buttons
                    1px 2px rgba(0,0,0,0.04)        

  \--shadow-md      0 4px 6px rgba(0,0,0,0.05), 0   Dropdowns, popovers
                    2px 4px rgba(0,0,0,0.04)        

  \--shadow-lg      0 10px 15px rgba(0,0,0,0.08), 0 Modals, dialogs
                    4px 6px rgba(0,0,0,0.04)        

  \--shadow-xl      0 20px 25px rgba(0,0,0,0.10), 0 Toast notifications
                    8px 10px rgba(0,0,0,0.04)       

  \--shadow-2xl     0 25px 50px rgba(0,0,0,0.15)    Overlays, spotlights

  \--shadow-inner   inset 0 2px 4px                 Pressed inputs, inset
                    rgba(0,0,0,0.04)                effects

  \--shadow-focus   0 0 0 3px rgba(26,95,122,0.3)   Focus rings
  -----------------------------------------------------------------------

2.1.6 Z-Index Tokens

  -----------------------------------------------------------------------
  **Token**               **Value**   **Usage**
  ----------------------- ----------- -----------------------------------
  \--z-base               0           Default stacking

  \--z-dropdown           100         Dropdowns, select menus

  \--z-sticky             200         Sticky headers, navigation

  \--z-fixed              300         Fixed elements, FAB

  \--z-drawer             400         Side drawers, panels

  \--z-modal-backdrop     500         Modal overlays

  \--z-modal              510         Modal content

  \--z-popover            600         Popovers, tooltips

  \--z-toast              700         Toast notifications

  \--z-tooltip            800         Tooltips (highest)
  -----------------------------------------------------------------------

2.1.7 Animation Tokens

Duration tokens:

  -----------------------------------------------------------------------
  **Token**               **Value**   **Usage**
  ----------------------- ----------- -----------------------------------
  \--duration-instant     0ms         No animation

  \--duration-fast        100ms       Micro-interactions, icon changes

  \--duration-normal      200ms       Standard transitions, hover

  \--duration-slow        300ms       Complex transitions, modals

  \--duration-slower      400ms       Page transitions

  \--duration-slowest     500ms       Large content reveals
  -----------------------------------------------------------------------

Easing tokens:

  ------------------------------------------------------------------------
  **Token**             **Value**                    **Usage**
  --------------------- ---------------------------- ---------------------
  \--ease-linear        linear                       Progress indicators

  \--ease-in            cubic-bezier(0.4, 0, 1, 1)   Elements leaving

  \--ease-out           cubic-bezier(0, 0, 0.2, 1)   Elements entering

  \--ease-in-out        cubic-bezier(0.4, 0, 0.2, 1) Element movement

  \--ease-bounce        cubic-bezier(0.68, -0.55,    Playful interactions
                        0.265, 1.55)                 

  \--ease-spring        cubic-bezier(0.175, 0.885,   Elastic effects
                        0.32, 1.275)                 
  ------------------------------------------------------------------------

3\. Component Library

All UI components with complete specifications including variants,
states, accessibility requirements, and implementation details.

3.1 Buttons

3.1.1 Button Variants

  ---------------------------------------------------------------------------------
  **Variant**      **Background**   **Text        **Border**     **Use Case**
                                    Color**                      
  ---------------- ---------------- ------------- -------------- ------------------
  Primary          primary-500      white         none           Main CTAs: Save,
                                                                 Submit, Confirm,
                                                                 Create

  Secondary        white            primary-500   1px            Secondary actions:
                                                  primary-500    Cancel, Back,
                                                                 Reset

  Tertiary/Ghost   transparent      primary-500   none           Inline actions,
                                                                 less emphasis

  Danger           error-500        white         none           Destructive:
                                                                 Delete, Remove,
                                                                 Disconnect

  Danger Outline   white            error-500     1px error-500  Softer destructive
                                                                 actions

  Success          success-500      white         none           Positive actions:
                                                                 Approve, Complete

  Link             transparent      primary-500   none           Inline text links
                                                                 styled as buttons
  ---------------------------------------------------------------------------------

3.1.2 Button Sizes

  -------------------------------------------------------------------------
  **Size**         **Height**   **Padding   **Font    **Icon    **Border
                                X**         Size**    Size**    Radius**
  ---------------- ------------ ----------- --------- --------- -----------
  Extra Small (xs) 28px         8px         12px      14px      4px

  Small (sm)       32px         12px        14px      16px      4px

  Medium (md)      40px         16px        14px      18px      6px

  Large (lg)       48px         20px        16px      20px      8px

  Extra Large (xl) 56px         24px        18px      22px      8px
  -------------------------------------------------------------------------

3.1.3 Button States

Each button variant must implement all states:

  ------------------------------------------------------------------------------
  **State**        **Visual Change**       **Cursor**    **Additional**
  ---------------- ----------------------- ------------- -----------------------
  Default          Base appearance         pointer       ---

  Hover            5% darker background,   pointer       Transition: 150ms
                   shadow-sm                             ease-out

  Focus            Focus ring (3px primary pointer       Must be visible for
                   at 30% opacity)                       keyboard nav

  Active/Pressed   10% darker background,  pointer       Transform: scale(0.98)
                   no shadow                             

  Loading          Spinner replaces text,  wait          Disabled click,
                   50% opacity                           aria-busy=true

  Disabled         40% opacity, gray-200   not-allowed   No hover effects,
                   background                            aria-disabled=true
  ------------------------------------------------------------------------------

3.1.4 Button Accessibility Requirements

- Minimum touch target: 44×44px (mobile)

- Focus visible: 3px focus ring clearly visible

- Color contrast: 4.5:1 for text against background

- ARIA labels: Required for icon-only buttons

- Loading state: Use aria-busy=\"true\" and aria-live=\"polite\"

- Disabled state: Use aria-disabled=\"true\", not just disabled
  attribute

- Button role: Use \<button\> element, not \<div\> or \<a\> for button
  behavior

3.2 Form Controls

3.2.1 Text Input

Specifications:

  ------------------------------------------------------------------------
  **Property**          **Value**             **Notes**
  --------------------- --------------------- ----------------------------
  Height                44px                  Mobile-friendly touch target

  Padding               12px horizontal,      Text vertically centered
                        centered vertical     

  Border                1px solid gray-300    Visible but subtle

  Border Radius         6px                   Consistent with design
                                              system

  Background            white                 Clean, high contrast

  Font Size             16px                  Prevents zoom on iOS

  Font Color            gray-900              High contrast

  Placeholder Color     gray-400              50% of text contrast minimum

  Focus Border          2px solid primary-500 Clear focus indication

  Focus Shadow          0 0 0 3px             Additional focus visibility
                        primary-500/20%       

  Error Border          2px solid error-500   Clear error indication

  Disabled Background   gray-100              Distinct disabled appearance

  Disabled Border       gray-200              Reduced prominence

  Disabled Text         gray-400              Reduced contrast
  ------------------------------------------------------------------------

3.2.2 Currency Input (BRL Only)

Specialized input for monetary values in Brazilian Real:

- **Structure:** \[R\$ Prefix\] \[Numeric Input\]

- **Currency Prefix:** 48px width, gray-50 background, \"R\$\" centered

- **Input Alignment:** Right-aligned text

- **Numeric Formatting:** Brazilian format with thousand separators
  (1.234,56)

- **Decimal Places:** Always show 2 decimal places

- **Negative Values:** Red text color, minus sign before R\$

- **Keyboard:** Numeric keypad on mobile (inputmode=\"decimal\")

- **Paste Handling:** Strip non-numeric characters, parse correctly

- **Tab Behavior:** Select all on focus for easy replacement

3.2.3 Select/Dropdown

Native-enhanced select with custom dropdown:

  -----------------------------------------------------------------------
  **Property**                 **Value**
  ---------------------------- ------------------------------------------
  Trigger Height               44px (same as input)

  Trigger Border               1px solid gray-300

  Chevron Icon                 20px, gray-400, right-aligned

  Dropdown Background          white

  Dropdown Border              1px solid gray-200

  Dropdown Shadow              shadow-lg

  Dropdown Max Height          280px with overflow scroll

  Option Height                40px

  Option Padding               12px horizontal

  Option Hover                 gray-50 background

  Option Selected              primary-50 background, primary-600 text

  Option Disabled              gray-300 text, cursor not-allowed

  Search (if enabled)          Sticky search input at top

  Multi-select                 Checkboxes on left of each option

  Clear All                    Link at bottom for multi-select
  -----------------------------------------------------------------------

3.2.4 Date Picker

Calendar-based date selection:

- **Input Display:** Formatted date in Brazilian format (e.g.,
  \"20/11/2025\")

- **Calendar Icon:** Right side of input, clickable to open

- **Dropdown Width:** 300px

- **Month Navigation:** Left/right arrows with month/year display

- **Week Headers:** D S T Q Q S S (Portuguese)

- **Day Cells:** 36px × 36px, centered numbers

- **Today:** Outlined with primary color

- **Selected:** Primary background, white text

- **Disabled Dates:** Gray text, no hover effect

- **Quick Select:** \"Hoje\", \"Ontem\" shortcuts

3.2.5 Checkbox

  -----------------------------------------------------------------------
  **Property**                 **Value**
  ---------------------------- ------------------------------------------
  Box Size                     20px × 20px

  Border                       2px solid gray-300

  Border Radius                4px

  Checked Background           primary-500

  Checked Border               primary-500

  Checkmark                    White, 2px stroke, animated

  Indeterminate                Horizontal line instead of check

  Focus Ring                   3px primary-500/30% offset 2px

  Disabled Unchecked           gray-200 background, gray-300 border

  Disabled Checked             gray-300 background, gray-400 check

  Label Spacing                8px from checkbox

  Click Area                   Entire label + checkbox
  -----------------------------------------------------------------------

3.2.6 Toggle Switch

  -----------------------------------------------------------------------
  **Property**                 **Value**
  ---------------------------- ------------------------------------------
  Track Size                   44px × 24px

  Track Border Radius          12px (full)

  Track Off Color              gray-200

  Track On Color               primary-500

  Thumb Size                   20px × 20px

  Thumb Color                  white

  Thumb Shadow                 shadow-sm

  Thumb Position Off           2px from left

  Thumb Position On            2px from right

  Transition                   200ms ease-in-out

  Focus Ring                   3px primary-500/30% around track

  Label Position               Left of toggle, 12px gap
  -----------------------------------------------------------------------

3.3 Cards

3.3.1 Base Card

  -----------------------------------------------------------------------
  **Property**                 **Value**
  ---------------------------- ------------------------------------------
  Background                   white

  Border                       1px solid gray-200

  Border Radius                8px

  Padding                      24px (desktop), 16px (mobile)

  Shadow                       shadow-sm

  Hover (if clickable)         shadow-md, translateY(-2px)

  Focus (if clickable)         Focus ring around entire card

  Active (if clickable)        shadow-xs, translateY(0)
  -----------------------------------------------------------------------

3.3.2 Metric Card (Dashboard)

Displays key financial metrics:

  -----------------------------------------------------------------------
  **Element**             **Specification**
  ----------------------- -----------------------------------------------
  Container Size          Flexible width, min 200px

  Icon Container          40px × 40px, rounded-lg, colored background
                          (10% opacity)

  Icon Size               24px, matching category/metric color

  Label                   14px, gray-500, above value

  Value                   28px, font-bold, gray-900

  Currency Prefix         20px, font-normal, gray-600, \"R\$\" before
                          value

  Trend Indicator         Arrow icon + percentage, 14px

  Trend Positive          success-500, arrow up

  Trend Negative          error-500, arrow down

  Trend Neutral           gray-500, horizontal arrow

  Comparison Text         12px, gray-400, \"vs mês anterior\"
  -----------------------------------------------------------------------

3.3.3 Transaction Card/Row

List item for displaying transactions:

  -----------------------------------------------------------------------
  **Element**           **Specification**
  --------------------- -------------------------------------------------
  Container Height      64px minimum

  Container Padding     16px horizontal, 12px vertical

  Category Indicator    40px × 40px circle, category color bg, white icon

  Description           16px, gray-900, font-medium, truncate with
                        ellipsis

  Notes Preview         14px, gray-500, single line truncated

  Date                  14px, gray-500, right side or below description

  Amount - Income       16px, font-semibold, success-600, right aligned,
                        \"+ R\$ X\"

  Amount - Expense      16px, font-semibold, error-600, right aligned,
                        \"- R\$ X\"

  Hover State           gray-50 background

  Selected State        primary-50 background, primary-200 left border

  Recurring Badge       Refresh icon, 12px, gray-400

  Uncategorized         Gray dashed circle, question mark icon
  -----------------------------------------------------------------------

3.3.4 Goal Progress Card (Spending Limits Only)

  -----------------------------------------------------------------------
  **Element**           **Specification**
  --------------------- -------------------------------------------------
  Category Icon         32px × 32px, category color

  Goal Name             16px, font-semibold, gray-900

  Goal Type Badge       12px, uppercase, gray-500, \"LIMITE MENSAL\"

  Progress Bar Height   8px

  Progress Bar          gray-200
  Background            

  Progress Bar Fill     success-500 (\<100%), error-500 (≥100%)

  Progress Bar Radius   full (4px)

  Percentage Label      14px, font-medium, matches bar color

  Amount Display        14px, \"R\$ X / R\$ Y\" format

  Over Limit Indicator  Pulsing glow effect on bar when ≥100%
  -----------------------------------------------------------------------

3.4 Navigation Components

3.4.1 Sidebar Navigation (Desktop)

  -----------------------------------------------------------------------
  **Property**            **Value**
  ----------------------- -----------------------------------------------
  Width Expanded          260px

  Width Collapsed         72px

  Background              white

  Border Right            1px solid gray-200

  Shadow                  shadow-sm

  Logo Area Height        64px

  Logo Padding            16px horizontal

  Nav Item Height         44px

  Nav Item Padding        12px horizontal

  Nav Item Gap            4px vertical

  Icon Size               20px

  Icon Color (Inactive)   gray-500

  Icon Color (Active)     primary-600

  Label Font              14px, font-medium

  Label Color (Inactive)  gray-700

  Label Color (Active)    primary-700

  Hover Background        gray-50

  Active Background       primary-50

  Active Left Border      3px solid primary-500

  Section Divider         1px solid gray-200, 16px vertical margin

  Collapse Button         Bottom of nav, chevron icon

  User Section            Bottom, initials circle (32px) + name +
                          settings
  -----------------------------------------------------------------------

3.4.2 Bottom Navigation (Mobile)

  -----------------------------------------------------------------------
  **Property**            **Value**
  ----------------------- -----------------------------------------------
  Height                  64px + safe area inset

  Background              white

  Border Top              1px solid gray-200

  Shadow                  shadow-lg (inverted)

  Max Items               5

  Item Width              Equal distribution (20% each)

  Icon Size               24px

  Icon Color (Inactive)   gray-400

  Icon Color (Active)     primary-500

  Label Font              10px

  Label (Inactive)        Hidden

  Label (Active)          Visible, primary-500

  Active Indicator        4px dot above icon OR filled icon variant

  FAB Integration         Center item can be elevated FAB

  FAB Size                56px diameter, primary background

  Safe Area               Respect bottom safe area on iOS
  -----------------------------------------------------------------------

3.4.3 Header/Top Bar

  -----------------------------------------------------------------------
  **Property**            **Value**
  ----------------------- -----------------------------------------------
  Height                  64px (desktop), 56px (mobile)

  Background              white

  Border Bottom           1px solid gray-200

  Shadow                  shadow-sm (on scroll)

  Left Content            Menu button (mobile) or breadcrumbs (desktop)

  Center Content          Page title (mobile)

  Right Content           Actions, notifications, profile initials,
                          refresh button

  Title Font              18px, font-semibold, gray-900

  Icon Buttons            40px × 40px touch target

  Notification Badge      8px dot, error-500, top-right of icon

  Profile Initials        32px circle, primary-100 bg, primary-700 text

  Sticky Behavior         Sticks to top on scroll

  Refresh Button          Rotate icon, triggers data reload
  -----------------------------------------------------------------------

3.5 Feedback Components

3.5.1 Toast Notifications

  -----------------------------------------------------------------------
  **Property**            **Value**
  ----------------------- -----------------------------------------------
  Position                Top-right (desktop), Top-center (mobile)

  Width                   360px (desktop), full width - 32px (mobile)

  Padding                 16px

  Border Radius           8px

  Shadow                  shadow-xl

  Icon Size               24px

  Title Font              14px, font-semibold

  Message Font            14px, font-normal

  Close Button            20px, gray-400, top-right

  Auto-dismiss            5 seconds default

  Progress Bar            Bottom, showing time remaining

  Stack Limit             3 visible, others queued

  Stack Offset            8px vertical between toasts

  Entry Animation         Slide from right, 300ms ease-out

  Exit Animation          Fade out + slide right, 200ms ease-in
  -----------------------------------------------------------------------

Toast variants:

  --------------------------------------------------------------------------------
  **Variant**   **Background**   **Border**    **Icon**          **Icon Color**
  ------------- ---------------- ------------- ----------------- -----------------
  Success       success-50       1px           Check circle      success-600
                                 success-200                     

  Error         error-50         1px error-200 X circle          error-600

  Warning       warning-50       1px           Alert triangle    warning-600
                                 warning-200                     

  Info          info-50          1px info-200  Info circle       info-600

  Neutral       white            1px gray-200  Bell              gray-600
  --------------------------------------------------------------------------------

3.5.2 Modal/Dialog

  -----------------------------------------------------------------------
  **Property**            **Value**
  ----------------------- -----------------------------------------------
  Backdrop                black at 50% opacity

  Backdrop Blur           4px (optional, for glassmorphism)

  Width (Small)           400px

  Width (Medium)          560px

  Width (Large)           720px

  Width (Full)            90vw, max 1200px

  Max Height              90vh

  Border Radius           12px

  Padding                 24px

  Header Font             20px, font-semibold

  Close Button            32px, top-right, gray-400

  Footer                  Right-aligned buttons, 16px gap

  Scroll                  Body scrolls, header/footer fixed

  Entry Animation         Scale from 95% + fade, 300ms

  Exit Animation          Scale to 95% + fade, 200ms

  Focus Trap              Tab cycles within modal

  Escape Key              Closes modal (configurable)

  Click Outside           Closes modal (configurable)
  -----------------------------------------------------------------------

3.5.3 Loading States

Spinner specifications:

  ----------------------------------------------------------------------------
  **Size**    **Dimension**   **Stroke       **Usage**
                              Width**        
  ----------- --------------- -------------- ---------------------------------
  xs          16px            2px            Inline, button loading

  sm          24px            2px            Small areas, inputs

  md          32px            3px            Cards, sections

  lg          48px            3px            Page sections

  xl          64px            4px            Full page loading
  ----------------------------------------------------------------------------

Skeleton specifications:

- **Background:** gray-200

- **Animation:** Shimmer effect (gradient sweep left to right)

- **Animation Duration:** 1.5s infinite

- **Border Radius:** 4px for text, 8px for cards, full for avatars

- **Text Skeleton Height:** Match font size with slight reduction

- **Line Spacing:** Match actual content line height

3.5.4 Empty States

When no content exists:

  -----------------------------------------------------------------------
  **Element**             **Specification**
  ----------------------- -----------------------------------------------
  Container               Centered, max-width 400px

  Illustration            128px × 128px, subtle, on-brand colors

  Headline                20px, font-semibold, gray-900

  Description             14px, gray-500, max 2 lines

  CTA Button              Primary, centered below description

  Vertical Spacing        24px between elements
  -----------------------------------------------------------------------

3.6 Data Refresh Components

3.6.1 Refresh Button

Manual data refresh control:

  -----------------------------------------------------------------------
  **Property**            **Value**
  ----------------------- -----------------------------------------------
  Icon                    Refresh/reload icon (rotate-cw)

  Size                    40px × 40px touch target

  Position                Header right side, near other actions

  Animation (loading)     Icon rotates continuously

  Disabled During Refresh Yes, prevents double-requests

  Success Feedback        Brief checkmark or toast

  Keyboard Shortcut       Ctrl/Cmd + R (custom handler)
  -----------------------------------------------------------------------

3.6.2 Pull-to-Refresh (Mobile)

  -----------------------------------------------------------------------
  **Property**            **Value**
  ----------------------- -----------------------------------------------
  Trigger Distance        80px pull down

  Indicator               Circular spinner appears at top

  Resistance              Progressive resistance after 40px

  Release Behavior        Snaps back with data refresh

  Loading State           Spinner visible until complete

  Success Feedback        Spinner replaced with checkmark briefly
  -----------------------------------------------------------------------

3.6.3 Last Updated Indicator

Shows data freshness:

  -----------------------------------------------------------------------
  **Property**            **Value**
  ----------------------- -----------------------------------------------
  Position                Below page title or in header

  Format                  \"Atualizado há X minutos\" or \"Atualizado às
                          HH:MM\"

  Font                    12px, gray-400

  Icon                    Clock icon (optional)

  Stale Warning           After 30 min: \"Dados podem estar
                          desatualizados. Atualizar?\"

  Click Action            Triggers refresh
  -----------------------------------------------------------------------

3.7 Data Visualization

3.7.1 Chart Color Palette

Sequential colors for category representation:

  ---------------------------------------------------------------------------
  **Order**   **Color**   **Hex**     **Category Example**
  ----------- ----------- ----------- ---------------------------------------
  1           Teal        #1A5F7A     Moradia

  2           Green       #22C55E     Receitas

  3           Amber       #F59E0B     Alimentação

  4           Red         #EF4444     Transporte

  5           Purple      #8B5CF6     Compras

  6           Pink        #EC4899     Entretenimento

  7           Cyan        #06B6D4     Saúde

  8           Lime        #84CC16     Educação

  9           Orange      #F97316     Pessoal

  10          Indigo      #6366F1     Viagens

  11          Rose        #F43F5E     Assinaturas

  12          Slate       #64748B     Outros
  ---------------------------------------------------------------------------

3.7.2 Donut Chart (Spending Breakdown)

  -----------------------------------------------------------------------
  **Property**            **Value**
  ----------------------- -----------------------------------------------
  Outer Radius            Responsive, min 120px

  Inner Radius            60% of outer radius

  Stroke Width            0 (filled segments)

  Segment Gap             2px white gap between segments

  Center Text - Amount    24px, font-bold, gray-900, \"R\$ X.XXX\"

  Center Text - Label     12px, gray-500, \"Total Gasto\"

  Hover Effect            Segment expands outward 8px

  Tooltip                 Category name, amount, percentage

  Animation               Segments draw clockwise, 800ms ease-out

  Legend Position         Below chart, horizontal wrap

  Legend Item             8px circle + 14px label, 16px gap between items
  -----------------------------------------------------------------------

3.7.3 Line/Area Chart (Trends)

  -----------------------------------------------------------------------
  **Property**            **Value**
  ----------------------- -----------------------------------------------
  Curve Type              Monotone (smooth)

  Line Stroke Width       2px

  Area Fill               Gradient from line color at 20% to 0%

  Data Points             6px circles on hover, 8px on active

  X-Axis                  Time periods (days, weeks, months)

  Y-Axis                  Currency values with abbreviations (1K, 1M) in
                          BRL

  Grid Lines              Horizontal only, dashed, gray-200

  Tooltip                 Vertical line + data card at point

  Tooltip Content         Date, Receitas, Despesas, Saldo

  Animation               Draw line left-to-right, 1000ms

  Legend                  Top-right, horizontal

  Responsive              Reduce data points on mobile
  -----------------------------------------------------------------------

3.7.4 Progress Bar (Spending Limits)

  -----------------------------------------------------------------------
  **Property**            **Value**
  ----------------------- -----------------------------------------------
  Track Height            8px

  Track Background        gray-200

  Track Border Radius     full (4px)

  Fill Border Radius      full (4px)

  Fill Colors             success-500 (\<100%), error-500 (≥100%)

  Overage Indicator       Striped pattern for \>100%

  Animation               Width transition, 500ms ease-out

  Label Position          Above bar, right-aligned

  Label Format            \"X% de R\$ Y\" or \"R\$ X / R\$ Y\"
  -----------------------------------------------------------------------

4\. Screen Specifications

Detailed layouts for each application screen with element positioning,
content requirements, and interaction behaviors.

4.1 Authentication Screens

4.1.1 Login Screen

Layout structure:

- **Page Type:** Full-screen, no navigation

- **Background:** Gradient from primary-500 to primary-700, diagonal

- **Card Position:** Centered vertically and horizontally

- **Card Width:** 420px (desktop), full width - 32px (mobile)

- **Card Padding:** 40px (desktop), 24px (mobile)

- **Card Shadow:** shadow-2xl

- **Card Radius:** 16px

Card content from top to bottom:

1.  Logo: 48px height, centered, 32px margin bottom

2.  Welcome text: \"Bem-vindo de volta\", 24px, font-semibold, centered

3.  Subtitle: \"Entre na sua conta\", 14px, gray-500, centered, 32px
    margin bottom

4.  Email input: Full width, envelope icon left, label \"E-mail\"

5.  Password input: Full width, lock icon left, visibility toggle right,
    label \"Senha\", 16px margin top

6.  Remember me + Forgot password row: Checkbox \"Lembrar-me\" left,
    link \"Esqueceu a senha?\" right, 16px margin top

7.  Login button: Primary, full width, \"Entrar\", 24px margin top

8.  Sign up link: \"Não tem uma conta? Criar conta\", 24px margin top,
    centered

4.1.2 Registration Screen

Same layout structure as login. Card content:

1.  Logo: Same as login

2.  Header: \"Criar Conta\", 24px, font-semibold

3.  Subtitle: \"Comece a controlar suas finanças\", 14px, gray-500

4.  Full name input: Person icon, label \"Nome completo\"

5.  Email input: Envelope icon, label \"E-mail\"

6.  Password input: Lock icon, visibility toggle, label \"Senha\"
    (minimum 8 characters)

7.  Confirm password input: Same as password, label \"Confirmar senha\"

8.  Terms checkbox: \"Eu concordo com os Termos de Serviço e Política de
    Privacidade\" (links)

9.  Create Account button: Primary, full width, \"Criar conta\"

10. Sign in link: \"Já tem uma conta? Entrar\"

4.2 Main Dashboard

4.2.1 Dashboard Layout (Desktop)

Grid structure:

- **Container:** Max-width 1440px, centered, 32px horizontal padding

- **Sidebar:** 260px fixed left

- **Main Content:** Remaining width, 32px padding

- **Grid:** 12-column grid, 24px gap

Content areas from top to bottom:

**Row 1 - Header (Full Width):**

- Left: Greeting (\"Bom dia, \[Nome\]\")

- Right: Period selector (Este Mês / Mês Passado) + Refresh button

- Below title: \"Atualizado há 5 minutos\" timestamp

- Height: 64px

**Row 2 - Metric Cards (Full Width):**

- 4 equal-width cards in a row

- Cards: Saldo Total, Receitas, Despesas, Economia

- Each card: Icon, label, amount in R\$, trend indicator

- Height: \~120px per card

**Row 3 - Main Content (8 columns) + Sidebar (4 columns):**

- Left column content:

- Spending Trends Chart: Area chart, last 3 months, 320px height

- Recent Transactions: List of 8 most recent, \"Ver todas\" link

- Right column content:

- Spending by Category: Donut chart with legend

- Goals Progress: List of active spending limits with progress bars

**Row 4 - Alerts Banner (Conditional, Full Width):**

- Shows when: Goals at risk, uncategorized transactions

- Dismissible, warning-50 background

4.2.2 Dashboard Layout (Mobile)

Single column layout:

1.  Header: Greeting + refresh icon, period selector below

2.  Last updated timestamp below header

3.  Metric cards: 2×2 grid, scrollable if needed

4.  Spending chart: Full width, reduced height (200px)

5.  Category donut: Full width, legend wraps

6.  Recent transactions: 5 items, \"Ver todas\" button

7.  Goals: Collapsed by default, expandable section

8.  Bottom nav: Fixed, 64px height

9.  Pull-to-refresh: Available on overscroll

4.2.3 Dashboard Interactions

- **Period Selector:** Dropdown with options: Este Mês, Mês Passado

- **Refresh Button:** Manual refresh, icon spins during loading

- **Pull to Refresh (Mobile):** Pull down to refresh all data

- **Metric Card Click:** Navigates to relevant detail view

- **Chart Hover:** Shows tooltip with exact values in R\$

- **Transaction Click:** Opens transaction detail modal

- **Goal Click:** Navigates to goal detail view

4.3 Transactions Screen

4.3.1 Transactions Layout

Header section:

- **Page Title:** \"Transações\", left-aligned

- **Last Updated:** Timestamp below title

- **Action Buttons (Right):** Refresh icon, \"Importar\" (Secondary),
  \"Nova Transação\" (Primary)

- **Below Title:** Transaction count (\"847 transações\") and total
  (\"R\$ -12.450,00 saldo\")

Filter bar (simplified for MVP):

  -------------------------------------------------------------------------
  **Filter**     **Type**       **Default**    **Options**
  -------------- -------------- -------------- ----------------------------
  Search         Text input     Empty          Searches description, notes

  Date Range     Date picker    Este Mês       Este Mês, Mês Passado

  Categories     Multi-select   Todas          User\'s categories

  Type           Segment        Todas          Todas / Receitas / Despesas
                 control                       
  -------------------------------------------------------------------------

- **Filter Collapse:** On mobile, filters collapse into a \"Filtros\"
  button that opens a bottom sheet

- **Active Filters:** Shown as chips below filter bar, each with × to
  remove

- **Clear All:** Link to reset all filters

Transaction list:

- **Grouping:** By date, with sticky date headers (\"Hoje\", \"Ontem\",
  \"18 Nov 2025\")

- **Date Header:** 16px, font-semibold, gray-500, 16px vertical padding

- **Daily Total:** Right side of date header, net amount for that day in
  R\$

- **Row Height:** 72px (with notes preview) or 64px (without)

- **Row Content:** Category icon, Description, Notes preview, Date/time,
  Amount

- **Hover:** gray-50 background, show action buttons (Edit, Delete)

- **Selection Mode:** Checkbox appears on left, bulk action bar at
  bottom

- **Empty State:** Illustration + \"Nenhuma transação encontrada\" +
  \"Importar Extrato\" CTA

4.3.2 Transaction Detail/Edit Modal

Modal width: 520px

Fields (simplified for MVP - no currency field):

  -----------------------------------------------------------------------------
  **Field**      **Type**        **Required**   **Notes**
  -------------- --------------- -------------- -------------------------------
  Description    Text input      Yes            From bank or manual entry

  Amount         Currency input  Yes            Negative for expense
                 (R\$)                          

  Date           Date picker     Yes            Defaults to today for new

  Category       Select with     No             Shows icon + name
                 icons                          

  Notes          Textarea        No             Max 500 characters

  Recurring      Toggle          No             Mark as recurring expense
  -----------------------------------------------------------------------------

Modal actions:

- **Save:** Primary button, validates and closes, refreshes list

- **Delete:** Danger link, left side, confirms before deleting

- **Cancel:** Secondary button or × close

- **Create Rule:** Link below category, \"Criar regra para transações
  similares\"

4.3.3 Transaction Import Flow (2 Steps - Simplified)

Simplified 2-step modal wizard:

**Step 1 - Upload & Preview (Modal 1/2):**

- Drag-drop zone: 200px height, dashed border, upload icon

- \"ou\" divider with \"Procurar Arquivos\" button

- Supported formats text: \"Arquivos CSV, OFX suportados\"

- Bank format dropdown: Auto-detectar, Nubank, Inter, Personalizado

- Progress bar appears during upload

- File size limit: 10MB

- After upload: Preview table showing Date, Description, Amount

- Summary: \"Encontradas 127 transações, 3 possíveis duplicadas\"

- Duplicate highlighting: Yellow row background, warning icon

- Checkbox: \"Ignorar transações duplicadas\"

- Column mapping (if Custom format): Dropdowns to map CSV columns

- \"Próximo\" button: Primary, proceeds to categorization

**Step 2 - Categorize & Confirm (Modal 2/2):**

- Shows uncategorized transactions list

- Quick-assign: Click category chip to assign to selected

- Bulk select: Checkbox to select similar (by description pattern)

- Create rule prompt: After categorizing, ask \"Criar regra para
  transações futuras?\"

- \"Pular\" option: Leave uncategorized for later

- Progress: \"42 de 127 categorizadas\"

- Summary card: Transactions to import, Categorized count, Skipped
  duplicates

- Total amount impact: \"Impacto: - R\$ 3.450,00\"

- \"Importar\" button: Primary, full width

- Success animation: Checkmark with confetti

- Post-import: \"Ver Transações\" or \"Importar Outro\"

4.4 Categories Screen

4.4.1 Categories Layout

Tab navigation:

- **Tabs:** \"Minhas Categorias\" \| \"Categorias do Grupo\" (if in
  groups)

- **Tab Style:** Underline indicator, primary-500

Category grid:

- **Grid:** 3 columns (desktop), 2 columns (tablet), 1 column (mobile)

- **Card Size:** Flexible width, 120px height

- **Gap:** 16px

Category card content:

- **Icon:** Left side, 48px circle with category color background, white
  24px icon

- **Name:** 16px, font-semibold, truncate if needed

- **Type Badge:** 12px chip, \"DESPESA\" or \"RECEITA\", subtle colors

- **Stats:** \"127 transações\" and \"R\$ 12.450 este mês\"

- **Hover Actions:** Edit and Delete icons appear

4.4.2 Category Create/Edit Modal

Modal width: 480px

Fields:

1.  Name input: 50 character max, required

2.  Type selector: Segment control (Despesa / Receita)

3.  Icon picker: Grid of 48 common icons, searchable

4.  Color picker: 12 preset colors + custom hex input

5.  Preview: Live preview of icon with selected color

4.5 Category Rules Screen

4.5.1 Rules List

Table layout:

  -----------------------------------------------------------------------
  **Column**        **Width**   **Content**
  ----------------- ----------- -----------------------------------------
  Drag Handle       40px        6-dot grip icon for reordering

  Pattern           Flexible    The regex pattern (with readable preview)

  Category          160px       Category icon + name

  Priority          80px        Number, editable inline

  Actions           100px       Edit, Delete, Toggle icons
  -----------------------------------------------------------------------

- **Drag Reorder:** Drag handle enables priority reordering

- **Toggle:** Enable/disable rule without deleting

- **Empty State:** \"Nenhuma regra criada\" + \"Regras categorizam
  transações automaticamente\"

4.5.2 Rule Create/Edit Modal (Regex with UI Helper)

Modal width: 520px

Fields with UI helper for regex generation:

1.  **Match Type Dropdown:** Options: \"Contém\", \"Começa com\",
    \"Exato\", \"Regex personalizado\"

2.  **Pattern Input:** Text input for the pattern value

3.  **Generated Regex Preview:** Shows the regex that will be sent to
    backend

- \"Contém: UBER\" → regex: .\*UBER.\*

- \"Começa com: PIX\" → regex: \^PIX.\*

- \"Exato: NETFLIX\" → regex: \^NETFLIX\$

- \"Regex personalizado\" → user enters raw regex

4.  **Test Results:** Shows sample of matching transactions from history
    (up to 5)

5.  **Category Selector:** Dropdown with icons

6.  **Priority:** Number input (higher = checked first)

Modal actions:

- **Test Pattern:** Secondary button, shows matching transactions

- **Save:** Primary button, saves the rule (sends regex to backend)

- **Cancel:** Secondary button or × close

4.6 Goals Screen (Spending Limits Only)

4.6.1 Goals Overview

Simplified layout (no tabs - spending limits only):

- **Page Title:** \"Limites de Gastos\", left-aligned

- **Action Button:** \"Novo Limite\" (Primary)

Goals grid:

- **Layout:** 2 columns (desktop), 1 column (mobile)

- **Card Height:** \~160px

4.6.2 Goal Create/Edit Modal (Simplified)

Modal width: 480px

Simplified fields (spending limits only, monthly, BRL):

  -----------------------------------------------------------------------
  **Field**         **Type**              **Notes**
  ----------------- --------------------- -------------------------------
  Category          Select with icons     Required, shows icon + name

  Limit Amount      Currency input (R\$)  The monthly spending limit

  Alert When Over   Toggle                Notify when limit exceeded
                                          (default: on)
  -----------------------------------------------------------------------

Modal actions:

- **Save:** Primary button, \"Salvar Limite\"

- **Delete:** Danger link (edit mode only), \"Excluir Limite\"

- **Cancel:** Secondary button or × close

4.7 Groups Screen

4.7.1 Groups List

Group card:

- **Card Size:** Full width, \~100px height

- **Left:** Group initials (48px circle, primary-100 bg)

- **Center:** Group name (18px, font-semibold), Member count (14px,
  gray-500)

- **Right:** Role badge (\"Admin\" or \"Membro\"), Chevron right

- **Click:** Navigates to group detail

4.7.2 Group Detail View

Header:

- **Group Name:** 24px, font-semibold

- **Member Initials:** Stacked circles, up to 5 + \"+3\" overflow

- **Settings Gear:** Admin only, top right

- **Refresh Button:** Top right, refreshes group data

- **Last Updated:** Timestamp showing when data was last fetched

Tab navigation:

  -----------------------------------------------------------------------
  **Tab**           **Content**
  ----------------- -----------------------------------------------------
  Dashboard         Combined spending metrics, charts, recent activity

  Transações        All members\' transactions, filterable by member

  Categorias        Shared categories for the group

  Membros           Member list with roles and management
  -----------------------------------------------------------------------

Members tab:

- **Member Row:** Initials circle, Name, Email, Role dropdown (Admin
  only), Remove button (Admin only)

- **Invite Button:** Opens invite modal with email input

- **Pending Invites:** Shown in separate section with \"Reenviar\" and
  \"Cancelar\" options

- **Leave Group:** Link at bottom, confirms before leaving

4.8 Settings Screen (Simplified)

4.8.1 Settings Sections

Organized in collapsible sections:

**Profile Section:**

- Initials Circle: 80px, primary-100 bg, primary-700 text (non-editable)

- Full Name: Inline editable text

- Email: Read-only

- Change Password: Link opens modal

**Preferences Section (Simplified):**

- Date Format: DD/MM/YYYY, MM/DD/YYYY, YYYY-MM-DD

- Number Format: 1.234,56 (BR) vs 1,234.56 (US)

- First Day of Week: Domingo / Segunda

**Notifications Section (Simplified):**

- Email Notifications: Toggle

- Over Limit Alerts: Toggle (for spending limits)

- Recurring Expense Reminders: Toggle

**Data & Privacy Section (Simplified):**

- Delete All Transactions: Danger button with confirmation

- Delete Account: Danger button with password confirmation (immediate
  deletion)

**About Section:**

- Version: App version number

- Links: Termos de Serviço, Política de Privacidade, Contato

- Logout: Danger button

5\. Data Refresh Patterns

This application uses REST API request/response patterns without
real-time synchronization. This section defines how data freshness is
maintained.

5.1 Refresh Triggers

  -----------------------------------------------------------------------
  **Trigger**           **Scope**                **User Action Required**
  --------------------- ------------------------ ------------------------
  Screen Navigation     Refresh data for new     No (automatic)
                        screen                   

  Pull-to-Refresh       Refresh current screen   Yes (mobile gesture)
                        data                     

  Refresh Button        Refresh current screen   Yes (button click)
                        data                     

  Form Submission       Refresh affected data    No (automatic)
                        after save               

  Import Completion     Refresh transaction list No (automatic)

  Period/Filter Change  Fetch new filtered data  No (automatic)

  Return from           Refresh if stale (\>5    No (automatic)
  Background            min)                     
  -----------------------------------------------------------------------

5.2 Loading States by Context

  -----------------------------------------------------------------------
  **Context**           **Initial Load**         **Refresh Load**
  --------------------- ------------------------ ------------------------
  Dashboard             Full skeleton            Spinner overlay
                                                 (semi-transparent)

  Transaction List      Skeleton rows            Pull indicator or inline
                                                 spinner

  Detail Modal          Skeleton content         Spinner in modal

  Charts                Skeleton rectangle       Fade + reload animation

  Forms                 N/A                      Button spinner on submit
  -----------------------------------------------------------------------

5.3 Stale Data Handling

- **Freshness Threshold:** Data older than 5 minutes shows \"Atualizado
  há X minutos\"

- **Stale Warning:** After 30 minutes, show subtle warning: \"Dados
  podem estar desatualizados\"

- **Auto-Refresh:** Not implemented (user-initiated only to save
  bandwidth)

- **Background Tab:** Do not refresh; refresh on tab focus if stale

5.4 Optimistic Updates

For better perceived performance, some actions update the UI immediately
before server confirmation:

  -----------------------------------------------------------------------
  **Action**        **Optimistic Behavior**    **Rollback on Error**
  ----------------- -------------------------- --------------------------
  Add Transaction   Add to list immediately    Remove and show error
                                               toast

  Edit Transaction  Update in list immediately Revert and show error
                                               toast

  Delete            Remove from list with      Restore and show error
  Transaction       animation                  toast

  Categorize        Update category display    Revert category
  Transaction                                  

  Toggle Goal       Toggle switch immediately  Revert toggle
  Notification                                 
  -----------------------------------------------------------------------

5.5 Error Recovery

- **Network Error:** Show error toast with \"Tentar novamente\" button

- **Server Error (5xx):** Show error toast, offer retry

- **Stale Response:** Show cached data with \"Atualizar\" prompt

- **Conflict (409):** Show message, offer to reload latest

6\. Responsive Design Specifications

6.1 Breakpoint Definitions

  -----------------------------------------------------------------------------
  **Breakpoint**   **Min     **Max     **Target          **Layout Changes**
                   Width**   Width**   Devices**         
  ---------------- --------- --------- ----------------- ----------------------
  xs (Mobile S)    0px       359px     Small phones      Single column, minimal
                                                         padding

  sm (Mobile)      360px     639px     Standard phones   Single column,
                                                         standard mobile UI

  md (Tablet)      640px     1023px    Tablets, large    2-column where
                                       phones landscape  appropriate

  lg (Desktop)     1024px    1279px    Laptops, small    Sidebar + main content
                                       monitors          

  xl (Desktop L)   1280px    1535px    Standard monitors Full sidebar, expanded
                                                         cards

  2xl (Desktop XL) 1536px    ∞         Large monitors,   Max-width containers,
                                       ultrawide         larger gaps
  -----------------------------------------------------------------------------

6.2 Layout Adaptations by Breakpoint

6.2.1 Navigation

  ----------------------------------------------------------------------------
  **Breakpoint**   **Navigation Type**   **Behavior**
  ---------------- --------------------- -------------------------------------
  xs-sm            Bottom tab bar        Fixed, 64px height, 5 items max

  md               Collapsed sidebar     72px width, icon-only, expand on
                                         hover

  lg+              Full sidebar          260px width, icons + labels,
                                         collapsible
  ----------------------------------------------------------------------------

6.2.2 Dashboard Grid

  -------------------------------------------------------------------------------
  **Breakpoint**   **Metric        **Charts**            **Content Columns**
                   Cards**                               
  ---------------- --------------- --------------------- ------------------------
  xs               1 per row,      Full width, reduced   Single column
                   vertical stack  height                

  sm               2 per row       Full width, 200px     Single column
                                   height                

  md               4 per row       Full width, 280px     Single column
                                   height                

  lg               4 per row       8-col width           8-col + 4-col sidebar

  xl+              4 per row,      8-col width, 360px    8-col + 4-col sidebar,
                   larger          height                larger gaps
  -------------------------------------------------------------------------------

6.3 Touch Adaptations (Mobile)

- **Touch Targets:** Minimum 44×44px for all interactive elements

- **Swipe Actions:** Swipe left on transactions reveals Edit/Delete

- **Pull to Refresh:** Overscroll triggers data refresh

- **Long Press:** Context menu on transactions, categories

- **Haptic Feedback:** Light haptic on button press, medium on actions

6.4 Desktop Enhancements

- **Hover States:** All interactive elements have hover feedback

- **Right-Click:** Context menus on transactions, categories

- **Keyboard Shortcuts:**

<!-- -->

- Ctrl/Cmd + N: New transaction

- Ctrl/Cmd + R: Refresh current data

- Ctrl/Cmd + F: Focus search

- Ctrl/Cmd + S: Save current form

- Escape: Close modal/dropdown

<!-- -->

- **Drag and Drop:** Reorder rules, categorize transactions

- **Multi-select:** Shift-click for range, Ctrl-click for individual

7\. Accessibility Requirements

WCAG 2.1 Level AA compliance is mandatory.

7.1 Color and Contrast

- **Text Contrast:** Minimum 4.5:1 for normal text (\<18px), 3:1 for
  large text (≥18px bold or ≥24px)

- **UI Component Contrast:** Minimum 3:1 for interactive components and
  graphical objects

- **Focus Indicators:** Minimum 3:1 contrast against adjacent colors

- **Color Independence:** Never use color alone to convey information

<!-- -->

- Income: Green color + up arrow icon + \"Receita\" label

- Expense: Red color + down arrow icon + \"Despesa\" label

- Errors: Red color + error icon + text message

7.2 Keyboard Navigation

- **Tab Order:** Logical, following visual layout (left-right,
  top-bottom)

- **Focus Visibility:** Clear focus indicator on all interactive
  elements

- **Skip Links:** \"Pular para conteúdo principal\" link as first
  focusable element

- **Focus Trapping:** Modals trap focus until closed

- **Arrow Key Navigation:** Within components (menus, tabs, radio
  groups)

- **Escape Key:** Closes modals, dropdowns, popovers

- **Enter/Space:** Activates buttons, links, checkboxes

7.3 Screen Reader Support

7.3.1 Semantic HTML

- **Landmarks:** Use \<header\>, \<nav\>, \<main\>, \<aside\>,
  \<footer\>

- **Headings:** Hierarchical structure (h1 → h2 → h3), single h1 per
  page

- **Lists:** Use \<ul\>, \<ol\> for lists, not divs

- **Tables:** Use \<table\> with \<th\>, scope attributes for data
  tables

- **Forms:** Every input has associated \<label\>

- **Buttons:** Use \<button\> for actions, \<a\> for navigation

7.3.2 ARIA Attributes

  ------------------------------------------------------------------------
  **Attribute**      **Usage**             **Example**
  ------------------ --------------------- -------------------------------
  aria-label         Labels for icon-only  \<button aria-label=\"Atualizar
                     buttons               dados\"\>

  aria-labelledby    Complex labels        Modal title referenced by modal
                     referencing visible   
                     text                  

  aria-describedby   Additional            Input linked to helper text
                     descriptions          

  aria-expanded      Expandable elements   Dropdown triggers, accordions

  aria-selected      Selection in lists    Tab selection, list items

  aria-live          Dynamic content       Toast notifications, error
                     updates               messages

  aria-busy          Loading states        Button during API call

  role               Non-semantic elements role=\"dialog\" for modals
  ------------------------------------------------------------------------

7.4 Motion and Animation

- **Reduced Motion:** Respect prefers-reduced-motion media query

<!-- -->

- If reduced: Disable all animations, use opacity transitions only

<!-- -->

- **Animation Duration:** No animations longer than 5 seconds without
  user control

- **Flashing Content:** No content flashing more than 3 times per second

8\. Error Handling and Edge Cases

8.1 Form Validation Errors

  -----------------------------------------------------------------------
  **Field**       **Validation Rules**     **Error Message**
  --------------- ------------------------ ------------------------------
  Email           Required, valid format   \"Por favor, insira um e-mail
                                           válido\"

  Password        Min 8 characters         \"A senha deve ter pelo menos
                                           8 caracteres\"

  Amount          Required, positive       \"Por favor, insira um valor
                  number                   válido\"

  Date            Valid date, not future   \"A data não pode ser no
                  (for transactions)       futuro\"

  Name            Required, min 2 chars    \"O nome deve ter pelo menos 2
                                           caracteres\"
  -----------------------------------------------------------------------

8.2 API Error Handling

  ---------------------------------------------------------------------------
  **Error Type** **HTTP    **User Message**        **UI Action**
                 Code**                            
  -------------- --------- ----------------------- --------------------------
  Network error  ---       \"Sem conexão.          Toast with retry button
                           Verifique sua           
                           internet.\"             

  Server error   500       \"Algo deu errado.      Toast with retry
                           Tente novamente.\"      

  Not found      404       \"Item não              Redirect to list
                           encontrado.\"           

  Unauthorized   401       ---                     Redirect to login

  Forbidden      403       \"Você não tem          Toast
                           permissão.\"            

  Validation     400       Field-specific messages Inline field errors
  error                                            

  Rate limited   429       \"Muitas requisições.   Toast with countdown
                           Aguarde.\"              

  Conflict       409       \"Este item já          Toast with details
                           existe.\"               
  ---------------------------------------------------------------------------

8.3 Empty States

  -----------------------------------------------------------------------
  **Screen/Component**    **Headline**            **CTA**
  ----------------------- ----------------------- -----------------------
  Transactions (new user) Nenhuma transação ainda Importar Extrato

  Transactions (filtered) Nenhuma transação       Limpar Filtros
                          encontrada              

  Categories              Nenhuma categoria       Criar Categoria
                          criada                  

  Goals                   Nenhum limite definido  Criar Limite

  Groups                  Nenhum grupo ainda      Criar Grupo
  -----------------------------------------------------------------------

8.4 Offline States

- **Detection:** Monitor navigator.onLine and fetch failures

- **Banner:** Sticky top banner: \"Você está offline. Algumas funções
  indisponíveis.\"

- **Banner Color:** warning-50 background, warning-600 text

- **Cached Data:** Show stale data with \"Atualizado há X\" note

- **Disabled Actions:** Disable actions requiring network, show tooltip
  explaining

- **Reconnection:** Remove banner, optionally prompt to refresh

9\. Performance Requirements

9.1 Core Web Vitals Targets

  ------------------------------------------------------------------------
  **Metric**              **Target**   **Measurement**
  ----------------------- ------------ -----------------------------------
  Largest Contentful      \< 2.5s      Time to render largest content
  Paint (LCP)                          element

  First Input Delay (FID) \< 100ms     Time from first interaction to
                                       response

  Cumulative Layout Shift \< 0.1       Visual stability during load
  (CLS)                                

  Time to Interactive     \< 3.5s      Time until page is fully
  (TTI)                                interactive
  ------------------------------------------------------------------------

9.2 Asset Optimization

- **Images:** WebP format, responsive sizes, lazy loading below fold

- **Icons:** SVG sprite or icon font, inline critical icons

- **Fonts:** Subset to used characters, WOFF2 format, preload critical

- **JavaScript:** Code splitting by route, tree shaking, minification

- **CSS:** Purge unused styles, critical CSS inlined

9.3 Caching Strategy

- **Static Assets:** Long-term cache with hash-based filenames

- **API Responses:** SWR pattern (stale-while-revalidate)

- **User Data:** IndexedDB for offline access

- **Service Worker:** Cache-first for assets, network-first for API

10\. Appendix

10.1 Technology Recommendations

  -----------------------------------------------------------------------
  **Layer**         **Technology**        **Notes**
  ----------------- --------------------- -------------------------------
  Framework         React 18+ / Next.js   Component architecture, SSR
                    14+                   support

  Language          TypeScript            Type safety, better DX

  Styling           Tailwind CSS          Utility-first, design token
                                          support

  State Management  Zustand / React Query Simple global state, server
                                          cache

  Forms             React Hook Form + Zod Performance, validation

  Charts            Recharts / Victory    React-native charts, responsive

  Animation         Framer Motion         Declarative animations

  HTTP Client       Axios / Fetch + React Request handling, caching
                    Query                 

  Testing           Vitest, RTL,          Unit, integration, E2E
                    Playwright            
  -----------------------------------------------------------------------

10.2 Browser Support

  -----------------------------------------------------------------------
  **Browser**             **Minimum         **Notes**
                          Version**         
  ----------------------- ----------------- -----------------------------
  Chrome                  90+               Full support

  Firefox                 88+               Full support

  Safari                  14+               Full support

  Edge                    90+               Full support (Chromium)

  iOS Safari              14+               Full support

  Chrome Android          90+               Full support
  -----------------------------------------------------------------------

10.3 MVP Scope Summary

  -------------------------------------------------------------------------
  **Feature**            **Status**   **Notes**
  ---------------------- ------------ -------------------------------------
  Email/Password Auth    ✅ Included  Local authentication only

  Social Auth            ❌ Removed   Deferred to post-MVP
  (Google/Apple)                      

  Multi-currency         ❌ Removed   BRL only
  (BRL/USD)                           

  Dark Mode              ❌ Removed   Light mode only

  i18n                   ❌ Removed   Portuguese only
  (Portuguese/English)                

  Data Export            ❌ Removed   Deferred to post-MVP

  Avatar Upload          ❌ Removed   Initials circle only

  Push Notifications     ❌ Removed   Email notifications only

  Weekly Summary Email   ❌ Removed   Deferred to post-MVP

  Savings Goals          ❌ Removed   Spending limits only

  4-Step Import Wizard   🔄           2-step wizard
                         Simplified   

  Groups/Collaboration   ✅ Included  Full group features

  Category Rules (Regex) ✅ Included  With UI helper for pattern generation
  -------------------------------------------------------------------------

10.4 Document Revision History

  -------------------------------------------------------------------------
  **Version**   **Date**          **Changes**
  ------------- ----------------- -----------------------------------------
  1.0           November 2025     Initial comprehensive specification

  2.0           November 2025     Removed real-time sync/WebSocket, added
                                  REST patterns

  3.0           November 2025     MVP scope: removed dark mode,
                                  multi-currency, social auth, simplified
                                  goals/import/settings
  -------------------------------------------------------------------------

Document Sign-Off

This Frontend UI Requirements Document has been reviewed and approved by
the following stakeholders:

  -----------------------------------------------------------------------
  **Role**          **Name**          **Signature**     **Date**
  ----------------- ----------------- ----------------- -----------------
  Product Manager                                       

  Lead Designer                                         

  Frontend Lead                                         

  QA Lead                                               
  -----------------------------------------------------------------------
