// Preview-only copy of the live site's ArmyTheme2 button rules (btn-army-gold /
// -white / -black, each with -sm, -arrow and -sm-arrow variants). The copy output
// never ships this: the live theme already provides it, and the generated button
// cards only reference the classes. The preview iframe has no theme, so without
// this the buttons would render unstyled.
//
// Extracted from www.army.edu's Portals/_default/Skins/ArmyTheme2/skin.css (generated
// 5/18/2026): every top-level rule whose selector names a btn-army-* class, keeping
// only the `.at2-app` selector branch (the `.cke_editable` editor-iframe branch is
// dropped). Rule bodies are byte-for-byte unchanged — re-extract rather than hand-edit
// if the theme changes. The preview wraps the cards in `.at2-app` so these match.
export const PREVIEW_ARMY_BUTTONS_CSS = `
/* ArmyTheme2 :root tokens used by the btn-army-* rules */
.at2-app{--armyblack:#221f20;--armygold:#ffcc01;--armywhite:#fff;--fontSize16:1rem;--fontSize18:1.125rem;--textBold:"GI-530",Arial,Helvetica,sans-serif}
/* Bootstrap 4's .btn-block (the theme loads Bootstrap separately) */
.btn-block{display:block;width:100%}
.at2-app .btn-army-gold{background-color:var(--armygold);border:2px solid var(--armyblack);border-radius:0;color:var(--armyblack);cursor:pointer;display:inline-block;font-family:var(--textBold);font-size:var(--fontSize18);padding:14px 24px;position:relative;text-decoration:none;text-transform:uppercase;transition:all 0 linear!important;will-change:border-width}
.at2-app .btn-army-gold:focus-visible,.at2-app .btn-army-gold:hover{background-color:var(--armygold);border-bottom-width:4px;border-color:2px solid var(--armyblack);border-right-width:4px;color:var(--armyblack);margin:-2px -2px 0 0;text-decoration:none}
.at2-app .btn-army-gold:active{border-bottom-width:2px;border-right-width:2px;margin:0}
.at2-app .btn-army-gold:active,.at2-app .btn-army-gold:visited{background-color:var(--armygold);border-color:var(--armyblack);color:var(--armyblack)}
.at2-app .btn-army-gold-sm{background-color:var(--armygold);border:2px solid var(--armyblack);border-radius:0;color:var(--armyblack);cursor:pointer;display:inline-block;font-family:var(--textBold);font-size:var(--fontSize18);font-size:var(--fontSize16);padding:10px 20px;position:relative;text-decoration:none;text-transform:uppercase;transition:all 0 linear!important;will-change:border-width}
.at2-app .btn-army-gold-sm:focus-visible,.at2-app .btn-army-gold-sm:hover{background-color:var(--armygold);border-bottom-width:4px;border-color:2px solid var(--armyblack);border-right-width:4px;color:var(--armyblack);margin:-2px -2px 0 0;text-decoration:none}
.at2-app .btn-army-gold-sm:active{border-bottom-width:2px;border-right-width:2px;margin:0}
.at2-app .btn-army-gold-sm:active,.at2-app .btn-army-gold-sm:visited{background-color:var(--armygold);border-color:var(--armyblack);color:var(--armyblack)}
.at2-app .btn-army-gold-arrow{background-color:var(--armygold);border:2px solid var(--armyblack);border-radius:0;color:var(--armyblack);cursor:pointer;display:inline-block;font-family:var(--textBold);font-size:var(--fontSize18);padding:14px 24px;position:relative;text-decoration:none;text-transform:uppercase;transition:all 0 linear!important;will-change:border-width}
.at2-app .btn-army-gold-arrow:focus-visible,.at2-app .btn-army-gold-arrow:hover{background-color:var(--armygold);border-bottom-width:4px;border-color:2px solid var(--armyblack);border-right-width:4px;color:var(--armyblack);margin:-2px -2px 0 0;text-decoration:none}
.at2-app .btn-army-gold-arrow:active{border-bottom-width:2px;border-right-width:2px;margin:0}
.at2-app .btn-army-gold-arrow:active,.at2-app .btn-army-gold-arrow:visited{background-color:var(--armygold);border-color:var(--armyblack);color:var(--armyblack)}
.at2-app .btn-army-gold-arrow:after{content:url("data:image/svg+xml;charset=utf-8,%3Csvg width='15' height='9' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath fill-rule='evenodd' clip-rule='evenodd' d='M10.435 0 9.63.793l3.184 3.144H0v1.126h12.814L9.63 8.207l.805.793L15 4.5 10.435 0Z' fill='%23000'/%3E%3C/svg%3E");display:inline-block;height:20px;margin-left:8px;transform:translateX(0);transition:transform .2s ease-out;width:15px;will-change:transform}
.at2-app .btn-army-gold-arrow:hover:after{transform:translateX(6px)}
.at2-app .btn-army-gold-sm-arrow{background-color:var(--armygold);border:2px solid var(--armyblack);border-radius:0;color:var(--armyblack);cursor:pointer;display:inline-block;font-family:var(--textBold);font-size:var(--fontSize18);font-size:var(--fontSize16);padding:10px 20px;position:relative;text-decoration:none;text-transform:uppercase;transition:all 0 linear!important;will-change:border-width}
.at2-app .btn-army-gold-sm-arrow:focus-visible,.at2-app .btn-army-gold-sm-arrow:hover{background-color:var(--armygold);border-bottom-width:4px;border-color:2px solid var(--armyblack);border-right-width:4px;color:var(--armyblack);margin:-2px -2px 0 0;text-decoration:none}
.at2-app .btn-army-gold-sm-arrow:active{border-bottom-width:2px;border-right-width:2px;margin:0}
.at2-app .btn-army-gold-sm-arrow:active,.at2-app .btn-army-gold-sm-arrow:visited{background-color:var(--armygold);border-color:var(--armyblack);color:var(--armyblack)}
.at2-app .btn-army-gold-sm-arrow:after{content:url("data:image/svg+xml;charset=utf-8,%3Csvg width='15' height='9' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath fill-rule='evenodd' clip-rule='evenodd' d='M10.435 0 9.63.793l3.184 3.144H0v1.126h12.814L9.63 8.207l.805.793L15 4.5 10.435 0Z' fill='%23000'/%3E%3C/svg%3E");display:inline-block;height:20px;margin-left:8px;transform:translateX(0);transition:transform .2s ease-out;width:15px;will-change:transform}
.at2-app .btn-army-gold-sm-arrow:hover:after{transform:translateX(6px)}
.at2-app .btn-army-black{background-color:var(--armyblack);border:2px solid var(--armygold);border-radius:0;color:var(--armygold);cursor:pointer;display:inline-block;font-family:var(--textBold);font-size:var(--fontSize18);padding:14px 24px;position:relative;text-decoration:none;text-transform:uppercase;transition:all 0 linear!important;will-change:border-width}
.at2-app .btn-army-black:focus-visible,.at2-app .btn-army-black:hover{background-color:var(--armyblack);border-bottom-width:4px;border-color:2px solid var(--armygold);border-right-width:4px;color:var(--armygold);margin:-2px -2px 0 0;text-decoration:none}
.at2-app .btn-army-black:active{border-bottom-width:2px;border-right-width:2px;margin:0}
.at2-app .btn-army-black:active,.at2-app .btn-army-black:visited{background-color:var(--armyblack);border-color:var(--armygold);color:var(--armygold)}
.at2-app .btn-army-black-sm{background-color:var(--armyblack);border:2px solid var(--armygold);border-radius:0;color:var(--armygold);cursor:pointer;display:inline-block;font-family:var(--textBold);font-size:var(--fontSize18);font-size:var(--fontSize16);padding:10px 20px;position:relative;text-decoration:none;text-transform:uppercase;transition:all 0 linear!important;will-change:border-width}
.at2-app .btn-army-black-sm:focus-visible,.at2-app .btn-army-black-sm:hover{background-color:var(--armyblack);border-bottom-width:4px;border-color:2px solid var(--armygold);border-right-width:4px;color:var(--armygold);margin:-2px -2px 0 0;text-decoration:none}
.at2-app .btn-army-black-sm:active{border-bottom-width:2px;border-right-width:2px;margin:0}
.at2-app .btn-army-black-sm:active,.at2-app .btn-army-black-sm:visited{background-color:var(--armyblack);border-color:var(--armygold);color:var(--armygold)}
.at2-app .btn-army-black-arrow{background-color:var(--armyblack);border:2px solid var(--armygold);border-radius:0;color:var(--armygold);cursor:pointer;display:inline-block;font-family:var(--textBold);font-size:var(--fontSize18);padding:14px 24px;position:relative;text-decoration:none;text-transform:uppercase;transition:all 0 linear!important;will-change:border-width}
.at2-app .btn-army-black-arrow:focus-visible,.at2-app .btn-army-black-arrow:hover{background-color:var(--armyblack);border-bottom-width:4px;border-color:2px solid var(--armygold);border-right-width:4px;color:var(--armygold);margin:-2px -2px 0 0;text-decoration:none}
.at2-app .btn-army-black-arrow:active{border-bottom-width:2px;border-right-width:2px;margin:0}
.at2-app .btn-army-black-arrow:active,.at2-app .btn-army-black-arrow:visited{background-color:var(--armyblack);border-color:var(--armygold);color:var(--armygold)}
.at2-app .btn-army-black-arrow:after{content:url("data:image/svg+xml;charset=utf-8,%3Csvg width='15' height='9' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath fill-rule='evenodd' clip-rule='evenodd' d='M10.435 0 9.63.793l3.184 3.144H0v1.126h12.814L9.63 8.207l.805.793L15 4.5 10.435 0Z' fill='%23FFCC01'/%3E%3C/svg%3E");display:inline-block;height:20px;margin-left:8px;transform:translateX(0);transition:transform .2s ease-out;width:15px;will-change:transform}
.at2-app .btn-army-black-arrow:hover:after{transform:translateX(6px)}
.at2-app .btn-army-black-sm-arrow{background-color:var(--armyblack);border:2px solid var(--armygold);border-radius:0;color:var(--armygold);cursor:pointer;display:inline-block;font-family:var(--textBold);font-size:var(--fontSize18);font-size:var(--fontSize16);padding:10px 20px;position:relative;text-decoration:none;text-transform:uppercase;transition:all 0 linear!important;will-change:border-width}
.at2-app .btn-army-black-sm-arrow:focus-visible,.at2-app .btn-army-black-sm-arrow:hover{background-color:var(--armyblack);border-bottom-width:4px;border-color:2px solid var(--armygold);border-right-width:4px;color:var(--armygold);margin:-2px -2px 0 0;text-decoration:none}
.at2-app .btn-army-black-sm-arrow:active{background-color:var(--armyblack);border-bottom-width:2px;border-color:var(--armygold);border-right-width:2px;color:var(--armygold);margin:0}
.at2-app .btn-army-black-sm-arrow:visited{background-color:var(--armyblack);border-color:var(--armygold);color:var(--armygold)}
.at2-app .btn-army-black-sm-arrow:after{content:url("data:image/svg+xml;charset=utf-8,%3Csvg width='15' height='9' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath fill-rule='evenodd' clip-rule='evenodd' d='M10.435 0 9.63.793l3.184 3.144H0v1.126h12.814L9.63 8.207l.805.793L15 4.5 10.435 0Z' fill='%23FFCC01'/%3E%3C/svg%3E");display:inline-block;height:20px;margin-left:8px;transform:translateX(0);transition:transform .2s ease-out;width:15px;will-change:transform}
.at2-app .btn-army-black-sm-arrow:hover:after{transform:translateX(6px)}
.at2-app .btn-army-white{background-color:var(--armywhite);border:2px solid var(--armyblack);border-radius:0;color:var(--armyblack);cursor:pointer;display:inline-block;font-family:var(--textBold);font-size:var(--fontSize18);padding:14px 24px;position:relative;text-decoration:none;text-transform:uppercase;transition:all 0 linear!important;will-change:border-width}
.at2-app .btn-army-white:focus-visible,.at2-app .btn-army-white:hover{background-color:var(--armywhite);border-bottom-width:4px;border-color:2px solid var(--armyblack);border-right-width:4px;color:var(--armyblack);margin:-2px -2px 0 0;text-decoration:none}
.at2-app .btn-army-white:active{border-bottom-width:2px;border-right-width:2px;margin:0}
.at2-app .btn-army-white:active,.at2-app .btn-army-white:visited{background-color:var(--armywhite);border-color:var(--armyblack);color:var(--armyblack)}
.at2-app .btn-army-white-sm{background-color:var(--armywhite);border:2px solid var(--armyblack);border-radius:0;color:var(--armyblack);cursor:pointer;display:inline-block;font-family:var(--textBold);font-size:var(--fontSize18);font-size:var(--fontSize16);padding:10px 20px;position:relative;text-decoration:none;text-transform:uppercase;transition:all 0 linear!important;will-change:border-width}
.at2-app .btn-army-white-sm:focus-visible,.at2-app .btn-army-white-sm:hover{background-color:var(--armywhite);border-bottom-width:4px;border-color:2px solid var(--armyblack);border-right-width:4px;color:var(--armyblack);margin:-2px -2px 0 0;text-decoration:none}
.at2-app .btn-army-white-sm:active{border-bottom-width:2px;border-right-width:2px;margin:0}
.at2-app .btn-army-white-sm:active,.at2-app .btn-army-white-sm:visited{background-color:var(--armywhite);border-color:var(--armyblack);color:var(--armyblack)}
.at2-app .btn-army-white-arrow{background-color:var(--armywhite);border:2px solid var(--armyblack);border-radius:0;color:var(--armyblack);cursor:pointer;display:inline-block;font-family:var(--textBold);font-size:var(--fontSize18);padding:14px 24px;position:relative;text-decoration:none;text-transform:uppercase;transition:all 0 linear!important;will-change:border-width}
.at2-app .btn-army-white-arrow:focus-visible,.at2-app .btn-army-white-arrow:hover{background-color:var(--armywhite);border-bottom-width:4px;border-color:2px solid var(--armyblack);border-right-width:4px;color:var(--armyblack);margin:-2px -2px 0 0;text-decoration:none}
.at2-app .btn-army-white-arrow:active{border-bottom-width:2px;border-right-width:2px;margin:0}
.at2-app .btn-army-white-arrow:active,.at2-app .btn-army-white-arrow:visited{background-color:var(--armywhite);border-color:var(--armyblack);color:var(--armyblack)}
.at2-app .btn-army-white-arrow:after{content:url("data:image/svg+xml;charset=utf-8,%3Csvg width='15' height='9' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath fill-rule='evenodd' clip-rule='evenodd' d='M10.435 0 9.63.793l3.184 3.144H0v1.126h12.814L9.63 8.207l.805.793L15 4.5 10.435 0Z' fill='%23000'/%3E%3C/svg%3E");display:inline-block;height:20px;margin-left:8px;transform:translateX(0);transition:transform .2s ease-out;width:15px;will-change:transform}
.at2-app .btn-army-white-arrow:hover:after{transform:translateX(6px)}
.at2-app .btn-army-white-sm-arrow{background-color:var(--armywhite);border:2px solid var(--armyblack);border-radius:0;color:var(--armyblack);cursor:pointer;display:inline-block;font-family:var(--textBold);font-size:var(--fontSize18);font-size:var(--fontSize16);padding:10px 20px;position:relative;text-decoration:none;text-transform:uppercase;transition:all 0 linear!important;will-change:border-width}
.at2-app .btn-army-white-sm-arrow:focus-visible,.at2-app .btn-army-white-sm-arrow:hover{background-color:var(--armywhite);border-bottom-width:4px;border-color:2px solid var(--armyblack);border-right-width:4px;color:var(--armyblack);margin:-2px -2px 0 0;text-decoration:none}
.at2-app .btn-army-white-sm-arrow:active{background-color:var(--armywhite);border-bottom-width:2px;border-color:var(--armyblack);border-right-width:2px;color:var(--armyblack);margin:0}
.at2-app .btn-army-white-sm-arrow:visited{background-color:var(--armywhite);border-color:var(--armyblack);color:var(--armyblack)}
.at2-app .btn-army-white-sm-arrow:after{content:url("data:image/svg+xml;charset=utf-8,%3Csvg width='15' height='9' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath fill-rule='evenodd' clip-rule='evenodd' d='M10.435 0 9.63.793l3.184 3.144H0v1.126h12.814L9.63 8.207l.805.793L15 4.5 10.435 0Z' fill='%23000'/%3E%3C/svg%3E");display:inline-block;height:20px;margin-left:8px;transform:translateX(0);transition:transform .2s ease-out;width:15px;will-change:transform}
.at2-app .btn-army-white-sm-arrow:hover:after{transform:translateX(6px)}
`
