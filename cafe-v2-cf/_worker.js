/**
 * XIVIX 네이버 카페 자동화 v2 - Cloudflare Pages Worker
 * _worker.js (Advanced Mode)
 * 
 * 주요 기능:
 * - CP949 인코딩 (네이버 API 한글 깨짐 해결)
 * - GLM-5 (z.ai) 글 생성 엔진
 * - 스팸필터 대체 용어 7개
 * - multipart/form-data 발행 (이미지+해시태그)
 * - Rich HTML 본문 + CTA
 * - 금소법 준수 필터
 * 
 * KV 바인딩: CAFE_KV
 */

// ============================================================
// CP949 인코딩 (네이버 레거시 API 필수)
// ============================================================
const CP949_HANGUL_B64 = "sKGwooFBgUKwo4FDgUSwpLClsKawp4FFgUaBR4FIgUmwqLCpsKqwq7CssK2wrrCvgUqwsLCxsLKws7C0gUuBTLC1gU2BToFPsLaBUIFRgVKBU4FUgVWBVrC3sLiBV7C5sLqwu4FYgVmBWoFhgWKBY7C8sL2BZIFlsL6BZoFngWiwv4FpgWqBa4FsgW2BboFvgXCBcYFysMCBc7DBgXSBdYF2gXeBeIF5sMKBeoGBgYKww4GDgYSBhbDEgYaBh4GIgYmBioGLgYyBjYGOgY+BkIGRgZKBk4GUgZWBloGXgZiwxbDGgZmBmrDHgZuBnLDIsMmBnbDKgZ6Bn4GggaGBorDLsMyBo7DNsM6wz7DQgaSBpbDRsNKw07DUgaaBp4GosNWBqYGqgauw1oGsga2BroGvgbCBsYGysNew2IGzsNmw2rDbgbSBtYG2gbeBuIG5sNyw3bDegbqw34G7gbyw4LDhgb2BvoG/gcCBwYHCgcOw4rDjgcSw5LDlsOaBxYHGgcew54HIgcmw6IHKgcuBzLDpgc2BzoHPsOqB0IHRgdKB04HUgdWB1oHXsOuB2LDsgdmB2oHbgdyB3YHegd+B4LDtsO6B4YHisO+B44HksPCw8YHlsPKB5rDzgeeB6LD0sPWw9oHpsPeB6rD4sPmB64Hsge2B7oHvsPqw+4HwgfGw/IHygfOB9LD9gfWw/oH2gfeB+IH5gfqxobGigfuxo4H8saSB/YH+gkGCQoJDgkSxpYJFgkaCR7GmgkiCSYJKsaeCS4JMgk2CToJPglCCUYJSsaiCU4JUsamxqoJVglaCV4JYglmCWrGrsayCYYJisa2CY4JkgmWxroJmgmeCaIJpgmqCa4Jssa+xsIJtsbGCbrGygm+CcIJxgnKCc4J0sbOCdYJ2gnextIJ4gnmCerG1goGCgoKDgoSChYKGgoeCiLG2gomxt4KKgouCjIKNgo6Cj4KQgpGxuLG5gpKCk7G6gpSClbG7sbyxvbG+gpaCl4KYgpmxv7HAscGCmrHCgpuxw7HEgpyCnYKegp+CoLHFscaCoYKisceCo4KkgqWxyIKmgqeCqIKpgqqCq4Ksgq2CroKvgrCxybHKgrGCsoKzgrSCtYK2scuCt4K4grmCuoK7gryCvYK+gr+CwILBgsKCw4LEgsWCxoLHgsixzILJgsqCy4LMgs2CzoLPgtCxzbHOgtGC0rHPgtOC1ILVsdCC1oLXgtiC2YLagtuC3LHRsdKC3bHTgt6C34LgguGC4oLjguSC5bHUguaC54LosdWC6YLqguux1oLsgu2C7oLvgvCC8YLygvOC9IL1gvaC94L4gvmC+oL7gvyC/YL+sdex2INBg0Kx2YNDg0Sx2rHbsdyDRYNGg0eDSINJg0qx3bHeg0ux34NMseCDTYNOg0+DUINRg1Kx4YNTg1SDVYNWg1eDWINZg1qDYYNig2ODZINlg2aDZ4Nog2mDaoNrg2yDbYNug2+DcINxg3KDc7HiseODdIN1seSDdoN3seWx5oN4seeDeYN6g4GDgoODseix6YOEseqDhbHrseyDhoOHg4ix7YOJse6x77Hwg4qx8YOLg4yDjbHyg46x84OPg5CDkYOSg5Ox9LH1g5Sx9rH3sfiDlYOWg5ex+YOYg5mx+rH7g5qDm7H8g5yDnYOesf2Dn4Ogg6GDooOjg6SDpbH+sqGDprKisqOypIOng6iDqYOqg6uDrLKlsqaDrYOug6+DsIOxg7Kyp4Ozg7SDtYO2g7eDuIO5g7qDu4O8g72DvoO/g8CDwYPCg8ODxIPFg8aDx4PIg8mDyoPLg8yDzYPOg8+D0IPRg9KD04PUg9WD1oPXg9iD2YPag9uD3IPdg96D34Pgg+GyqLKpsqqD4rKrg+OD5IPlsqyD5oPng+iD6YPqg+uD7LKtsq6D7bKvsrCysYPug++D8IPxg/KD87KysrOD9IP1srSD9oP3g/iD+YP6g/uD/IP9g/6EQYRCsrWEQ4REsraERbK3hEaER4RIhEmESoRLsriETIRNhE6yuYRPhFCEUbK6hFKEU4RUhFWEVoRXhFiEWYRahGGyu7K8hGKEY4RkhGWyvYRmhGeyvoRohGmEaoRrhGyEbYRuhG+EcIRxhHKEc4R0hHWEdoR3hHiEeYR6hIGEgoSDhISEhYSGhIeEiLK/ssCEiYSKssGEi7LChIyyw4SNhI6Ej4SQhJGEkoSTssSyxYSUssaElbLHssiyyYSWhJeEmISZssqyy4SahJuEnISdhJ6En7LMhKCEoYSihKOEpISlhKaEp4SohKmEqrLNss6Eq4SshK2EroSvhLCyz7LQhLGEsoSzhLSEtYS2hLeEuIS5hLqEu4S8hL2EvoS/hMCEwYTChMOy0YTEhMWExoTHhMiEybLShMqEy4TMstOEzYTOhM+y1ITQhNGE0oTThNSE1YTWstWy1oTXhNiE2bLXhNqE24TchN2E3oTfstiE4IThhOKE44TkhOWE5oTnhOiE6YTqhOuE7ITthO6E74TwhPGE8oTzhPSE9YT2hPeE+IT5hPqy2bLahPuE/LLbhP2E/oVBstyFQoVDhUSFRYVGhUey3bLest+FSLLghUmy4bLihUqFS4VMhU2FTrLjhU+FUIVRhVKFU4VUhVWy5IVWhVeFWIVZhVqFYYVihWOFZIVlhWay5bLmhWeFaIVphWqFa4Vssuey6IVthW6y6YVvhXCFcbLqhXKFc4V0hXWFdoV3hXiy67LshXmFerLthYGFgoWDhYSFhYWGhYey7oWIhYmFirLvhYuFjIWNsvCFjoWPhZCFkYWShZOFlLLxsvKFlYWWhZeFmIWZhZqFm4WchZ2FnrLzhZ+FoIWhhaKFo4WkhaWFpoWnhaiFqYWqhauFrIWtha6Fr4WwhbGFsoWzhbSFtYW2hbeFuIW5svSy9YW6hbuy9oW8sveFvbL4hb6y+YW/hcCFwYXCsvqy+7L8hcOy/YXEsv6FxYXGhcezoYXIhcmFyoXLhcyFzYXOhc+F0IXRhdKF04XUhdWF1oXXhdiF2YXahduF3IXdhd6F34XgheGF4oXjheSF5bOis6OF5oXns6SF6IXpheqzpYXrheyF7YXuhe+F8IXxs6azp4Xys6iF87OphfSF9YX2hfeF+IX5s6qzq7OshfqzrYX7hfyzrrOvs7CzsYX9hf6GQYZChkOzsrOzhkSztLO1s7azt7O4hkWzuYZGs7qzu7O8hkeGSLO9hkmGSoZLs76GTIZNhk6GT4ZQhlGGUrO/s8CGU7PBs8Kzw4ZUhlWGVoZXhliGWbPEs8WGWoZhs8aGYoZjhmSzx4ZlhmaGZ4ZohmmGaoZrs8iGbIZthm6Gb7PJhnCGcYZyhnOGdIZ1hnaGd4Z4hnmGeoaBhoKGg4aEhoWGhoaHhoiGiYaKhouGjIaNho6Gj4aQhpGGkoaThpSGlYaWhpezyrPLhpizzLPNhpmGmoabs86GnLPPs9CGnYaehp+GoLPRs9KGobPTs9Sz1YaihqOGpIalhqaz1rPXs9iGp4aos9mGqYaqhquz2oashq2GroavhrCGsYays9uz3Iazs92z3rPfhrSGtYa2hreGuIa5s+Cz4Ya6hruz4oa8hr2GvrPjhr+GwIbBhsKGw4bEhsWz5LPlhsaGx7Pms+eGyIbJs+iGyobLhsyz6YbNhs6Gz7PqhtCG0YbShtOG1IbVhtaG14bYhtmG2obbhtyG3Ybeht+G4IbhhuKG44bkhuWG5rPrs+yG54bos+2G6Ybqhuuz7obss++G7Ybuhu+G8Ibxs/Cz8Ybys/KG87PzhvSG9Yb2hvez9LP1s/aG+Ib5hvqz94b7hvyG/bP4hv6HQYdCh0OHRIdFh0aHR4dIh0mHSrP5h0uHTIdNh06HT4dQh1GHUodTh1SHVYdWh1eHWIdZh1qHYYdih2OHZIdlh2aHZ4doh2mHaodrh2yHbYduh2+HcIdxh3KHc7P6h3SHdYd2s/uHd4d4h3mz/Id6h4GHgoeDh4SHhYeGs/2z/oeHtKGHiIeJh4qHi4eMh42HjoePtKK0o4eQh5G0pIeSh5OHlLSlh5WHloeXh5iHmYeah5uHnLSmh520p4eetKiHn4egh6GHooejh6S0qbSqh6WHprSrh6eHqLSstK2HqYeqh6uHrIeth66Hr7SutK+HsLSwh7G0sYeyh7OHtIe1h7aHt7Syh7iHuYe6h7uHvIe9h76Hv4fAh8GHwofDh8SHxYfGh8eHyIfJh8q0s4fLh8yHzYfOh8+H0IfRtLSH0ofTh9SH1YfWh9eH2IfZh9qH24fch92H3offh+CH4Yfih+OH5Iflh+aH54foh+mH6ofrh+y0tYfth+6H77S2h/CH8YfytLeH84f0h/WH9of3h/iH+bS4tLmH+of7h/yH/Yf+iEGIQohDiESIRbS6tLuIRohHiEiISYhKiEu0vIhMiE2ITohPiFCIUYhStL20vohTiFSIVbS/iFaIV4hYiFmIWohhtMC0wYhiiGO0wohkiGWIZrTDtMS0xYhniGiIaYhqiGu0xrTHiGy0yIhttMm0yohuiG+IcLTLiHG0zIhyiHOIdLTNiHWIdoh3tM6IeIh5iHqIgYiCiIOIhIiFiIaIh4iIiImIioiLiIyIjYiOiI+IkLTPtNCIkYiStNGIk4iUiJW00oiWtNOIl4iYiJmImoibtNS01YictNaInbTXiJ6In4igiKG02IiitNm02rTbiKO03IikiKW03bTetN+04LThiKaIp4iotOK047TkiKm05bTmtOe06LTpiKqIq4istOq067TsiK2IrrTtiK+IsIixtO6IsoiziLSItYi2iLeIuLTvtPCIubTxtPK084i6iLuIvIi9iL6Iv7T0iMCIwYjCiMOIxIjFiMaIx4jIiMmIyojLiMyIzYjOiM+I0IjRiNKI04jUiNWI1ojXiNiI2YjaiNuI3IjdiN6I34jgiOGI4ojjiOSI5YjmiOeI6IjpiOqI64jsiO2I7ojviPCI8YjyiPOI9Ij1iPa09bT2tPeI97T4iPiI+bT5tPqI+rT7tPyI+4j8iP2I/rT9tP6JQbWhiUK1oolDtaOJRIlFtaSJRrWltaaJR4lItaeJSYlKiUu1qIlMiU2JTolPiVCJUYlStam1qolTtau1rLWtiVSJVYlWiVeJWIlZta6JWolhiWK1r4ljiWSJZbWwiWaJZ4loiWmJaolriWyJbYluiW+JcLWxtbKJcYlyiXOJdIl1iXa1s4l3iXiJebW0iXqJgYmCiYOJhImFiYaJh4mIiYmJiomLiYyJjYmOiY+JkImRiZKJk4mUiZWJlrW1tbaJl4mYtbeJmYmatbi1uYmbtbqJnLW7iZ2Jnomftby1vYmgtb6JobW/iaK1wImjtcGJpImltcKJpomniai1w4mpiaqJq7XEiayJrYmuia+JsImxibKJs4m0ibWJtom3ibiJuYm6ibuJvIm9ib61xYm/icCJwYnCicOJxInFicaJx4nIicmJyonLicyJzYnOic+J0InRtcaJ0onTidSJ1YnWideJ2LXHidmJ2onbtciJ3Indid61yYnfieCJ4YniieOJ5Inltcq1y4nmtcyJ54noiemJ6onrieyJ7Ynutc2J74nwifGJ8onzifSJ9Yn2ifeJ+In5ifqJ+4n8if2J/opBikKKQ4pEikWKRopHikiKSYpKiku1zrXPikyKTbXQik6KT4pQtdGKUYpSilOKVIpVilaKV7XStdOKWLXUilm11YpaimGKYopjimSKZbXWimaKZ4poimmKaoprimyKbYpuim+KcIpxinKKc4p0inWKdop3ini114p5inqKgYqCioOKhIqFtdiKhoqHioiKiYqKiouKjIqNio6Kj4qQipGKkoqTipSKlYqWipeKmIqZtdmKmoqbipyKnYqeip+12oqgiqGKorXbiqOKpIqltdyKpoqniqiKqYqqiquKrIqttd2KrrXeiq+134qwirGKsoqzirSKtbXgiraKt4q4teGKuYq6iru14oq8ir2Kvoq/isCKwYrCteOKw4rEisWKxrXkiseKyIrJisqKy4rMteW15orNis6154rPitC16LXpitG16orSitOK1IrVita167Xsite17YrYte6K2YraituK3Irdit6174rfiuCK4YriiuOK5IrliuaK54roiumK6orriuyK7Yruiu+K8IrxivKK84r0ivWK9or3iviK+bXwtfGK+or7tfKK/Ir9tfO19Ir+i0GLQotDi0SLRYtGtfW19otHtfe1+LX5tfqLSItJi0qLS4tMtfu1/ItNi061/YtPi1CLUbX+i1KLU4tUi1WLVotXi1i2obaii1m2o7aktqWLWothi2KLY4tktqa2p7aoi2WLZrapi2eLaItptqqLaotri2yLbYtui2+LcLartqyLcbattq62r4tyi3OLdIt1i3aLd4t4i3mLeouBi4KLg4uEi4WLhouHi4iLiYuKi4uLjIuNi46Lj4uQi5GLkouTi5SLlYuWi5eLmIuZi5qLm4uci52Lnoufi6CLoYuii6OLpIuli6aLp4uoi6mLqouri6yLrYuui6+LsIuxi7KLs4u0i7W2sLaxi7aLt7ayi7iLuYu6trOLu7a0trWLvIu9i76Lv7a2treLwLa4trm2uovBi8KLw4vEi8W2u7a8tr2LxovHtr6LyIvJi8q2v4vLi8yLzYvOi8+L0IvRtsC2wYvStsK2w7bEi9OL1IvVi9aL14vYtsWL2Yvai9uL3Ivdi96L34vgi+GL4ovji+SL5Yvmi+eL6Ivpi+qL67bGi+yL7Yvui++L8Ivxi/KL84v0i/WL9ov3i/iL+Yv6i/uL/Iv9i/6MQYxCjEOMRIxFjEaMR4xIjEmMSoxLjEyMTYxOjE+MULbHtsiMUYxStsmMU4xUjFW2yoxWjFeMWIxZjFqMYYxijGOMZIxljGaMZ7bLjGiMaYxqjGuMbIxttsyMboxvjHCMcYxyjHOMdLbNjHWMdox3jHiMeYx6jIGMgoyDjISMhYyGjIeMiIyJjIqMi4yMjI22zoyOjI+MkIyRjJKMk4yUjJWMloyXjJiMmYyajJuMnIydjJ6Mn4ygjKGMooyjjKSMpYymjKeMqLbPjKmMqoyrttCMrIytjK6Mr4ywjLGMsoyzjLSMtYy2jLeMuIy5jLqMu4y8jL2Mvoy/jMCMwYzCjMOMxIzFjMaMx4zIjMmMyozLjMyMzYzOjM+M0IzRjNKM04zUjNWM1ozXjNiM2YzajNuM3IzdjN620bbSjN+M4LbTjOGM4ozjttSM5IzljOaM54zojOm21bbWjOqM64zsjO2214zujO+M8IzxjPKM84z0jPWM9oz3jPiM+Yz6jPuM/Iz9jP6NQY1CjUONRI1FjUaNR41IjUmNSo1LjUyNTY1OjU+NUI1RttiNUo1TjVSNVY1WjVeNWI1ZjVqNYY1ijWONZI1ljWaNZ41ojWmNao1rjWyNbY1ujW+NcI1xjXK22Y1zjXSNdbbajXaNd414ttuNeY16jYGNgo2DjYSNhbbctt2Nho2HjYi23o2JjYqNi42MjY2Njo2PjZCNkY2SjZONlI2VjZaNl42YjZmNmo2bjZyNnY2ejZ+NoI2hjaKNo42kjaWNpo2njaiNqY2qtt+24I2rjay24Y2tja624rbjja+NsI2xjbKNs420jbW25Lbljba25o23jbiNuY26jbuNvI29jb62542/jcCNwbbojcKNw43EtumNxY3GjceNyI3JjcqNy7bqtuuNzI3Njc6Nz43QjdGN0o3TjdSN1bbsjdaN143Ytu2N2Y3ajdu27o3cjd2N3o3fjeCN4Y3itu+28I3jtvGN5LbyjeWN5o3njeiN6Y3qtvO29I3rjey29Y3tje6N77b2jfCN8Y3yjfON9I31jfa297b4jfe2+bb6tvu2/I34jfmN+rb9tv63obeijfuN/Lejjf2N/o5Bt6SOQo5DjkSORY5GjkeOSLelt6aOSbent6i3qY5KjkuOTI5Njk6OT7eqt6uOUI5Rt6yOUo5TjlSOVY5WjleOWI5ZjlqOYY5ijmOOZI5lt62OZreujmeOaI5pjmqOa45sjm2Obo5vjnCOcY5yjnOOdI51jnaOd454jnmOeo6BjoKOg46EjoWOho6HjoiOiY6KjouOjI6Njo63r7ewjo+OkLexjpGOko6Tt7KOlI6VjpaOl46YjpmOmrezt7SOm7e1t7a3t46cjp2Ono6fjqC3uLe5t7qOoY6it7uOo46kjqW3vI6mjqeOqI6pjqqOq46st723vo6tt7+OrrfAjq+OsI6xjrKOs460t8G3wo61jra3w463jriOubfEjrqOu468jr2Ovo6/jsC3xbfGjsG3x7fIt8mOwo7DjsSOxY7Gjse3yo7IjsmOyrfLjsuOzI7Njs6Oz47QjtGO0o7TjtSO1Y7Wt8yO17fNjtiO2Y7ajtuO3I7djt6O37fOt8+O4I7ht9CO4o7jjuS30Y7ljuaO547ojumO6o7rt9K3047st9SO7bfVju6O747wjvGO8o7zt9aO9I71jva31473jviO+Y76jvuO/I79jv6PQY9Cj0OPRI9Fj0aPR49It9iPSY9Kj0uPTI9Nj06PT49Qj1GPUo9Tj1SPVY9Wj1ePWI9Zj1qPYY9ij2OPZI9lj2aPZ49ot9mPaY9qj2uPbI9tj26Pb7faj3CPcY9yt9uPc490j3W33I92j3ePeI95j3qPgY+Ct9233o+Dt9+PhLfgj4WPho+Hj4iPiY+Kt+GPi4+Mj4234o+Oj4+PkLfjj5GPko+Tj5SPlY+Wj5ePmLfkj5m35Y+at+aPm4+cj52Pno+fj6C357foj6GPorfpj6OPpI+lt+qPpo+nj6iPqY+qj6uPrLfrt+yPrbftj6637o+vj7CPsY+yj7OPtLfvj7WPto+3j7iPuY+6j7uPvI+9j76Pv4/Aj8GPwo/Dj8SPxY/Gj8e38I/Ij8mPyo/Lj8yPzY/Ot/GPz4/Qj9GP0o/Tj9SP1Y/Wj9eP2I/Zj9qP24/cj92P3o/fj+CP4Y/ij+OP5I/lj+aP54/oj+m38rfzj+qP67f0j+yP7Y/ut/WP74/wj/GP8o/zj/SP9bf2j/aP97f3j/i3+I/5j/qP+4/8j/2P/rf5t/qQQZBCt/uQQ5BEkEW3/JBGkEeQSJBJkEqQS5BMt/23/pBNuKGQTriikE+QUJBRkFKQU5BUuKO4pJBVkFa4pZBXkFiQWbimkFqQYZBikGOQZJBlkGa4p7iokGe4qZBouKq4q5BpkGq4rLitkGuQbJBtkG6Qb5BwkHGQcpBzkHSQdZB2kHeQeJB5kHqQgZCCkIOQhJCFkIaQh5CIkImQipCLkIyQjbiuuK+QjpCPuLCQkJCRkJK4sZCTkJSQlZCWkJeQmJCZuLK4s5CauLSQm7i1kJyQnZCekJ+QoJChuLa4t5CikKO4uJCkuLm4uri7uLy4vZClkKaQp5CokKm4vri/kKq4wJCruMG4wpCskK24w5CuuMS4xbjGkK+QsLjHkLGQspCzuMiQtJC1kLaQt5C4kLmQurjJuMqQu7jLuMy4zbjOkLyQvZC+kL+QwLjPuNCQwZDCkMOQxJDFkMa40ZDHkMiQyZDKkMuQzJDNkM6Qz5DQkNGQ0rjSkNOQ1JDVkNaQ15DYkNmQ2pDbkNyQ3ZDekN+Q4JDhkOKQ45DkkOWQ5pDnkOiQ6ZDqkOuQ7JDtkO6Q75DwkPGQ8pDzkPS407jUkPWQ9rjVkPeQ+JD5uNaQ+rjXkPuQ/JD9kP6RQbjYuNmRQrjakUO427jckUSRRZFGkUe43bjeuN+RSJFJuOCRSpFLkUy44ZFNkU6RT5FQkVGRUpFTuOK445FUuOS45bjmkVWRVpFXkViRWZFauOe46JFhkWK46ZFjkWSRZbjqkWaRZ5FokWmRapFrkWyRbZFukW+467jsuO2RcLjukXGRcpFzkXS475F1kXaRd5F4kXmRepGBkYKRg5GEkYWRhpGHkYiRiZGKkYuRjJGNkY6Rj5GQkZGRkpGTkZSRlbjwuPGRlrjyuPORl5GYkZm49JGauPWRm5GckZ2RnpGfuPa495GguPiRobj5kaKRo5GkkaWRppGnuPqRqJGpkaq4+5GrkayRrZGuka+RsJGxkbKRs5G0kbWRtpG3kbiRubj8uP2RupG7kbyRvZG+kb+RwJHBkcKRw5HEkcWRxpHHkciRyZHKkcuRzJHNkc6Rz5HQkdGR0pHTkdSR1ZHWkdeR2JHZkdqR27j+kdyR3ZHeuaGR35HgkeG5opHikeOR5JHlkeaR55Hokem5o5HquaSR67mlkeyR7ZHuke+R8JHxuaaR8pHzkfS5p5H1kfaR97mokfiR+ZH6kfuR/JH9kf6SQbmpkkK5qpJDkkSSRZJGkkeSSJJJkkq5q7msua2SS7mukkySTbmvubC5sbmykk6ST5JQklGSUrmzubSSU7m1klS5tpJVklaSV7m3kli5uLm5klmSWpJhubqSYpJjkmS5u5JlkmaSZ5JokmmSapJrkmy5vJJtub2SbpJvknCScZJyknOSdJJ1ub6SdpJ3kniSeZJ6koGSgpKDkoSShZKGkoeSiJKJkoqSi5KMko2SjpKPkpCSkZKSkpOSlJKVkpa5v5KXkpiSmbnAkpqSm5KcucGSnZKekp+SoJKhkqKSo5KkkqWSppKnkqiSqZKqkquSrJKtkq6Sr7nCkrCSsZKyucOSs5K0krW5xJK2kreSuJK5krqSu5K8ucWSvZK+ucaSv5LAksGSwpLDksSSxZLGuceSx5LIksm5yJLKksuSzLnJks2SzpLPktCS0ZLSktO5ypLUktW5y5LWkteS2JLZktqS25Lckt2S3pLfkuCS4ZLikuOS5JLlkuaS55LokumS6pLrkuyS7ZLuku+S8JLxkvKS85L0kvWS9pL3kviS+bnMuc2S+pL7uc6S/JL9uc+50JL+udGTQZNCk0OTRJNFudK505NGudS51bnWk0e515NIudiTSZNKudm52rnbudy53ZNLk0y53rnfueC54bnik02TTpNPk1C547nkk1G55ZNSueaTU5NUk1W555NWk1e56Lnpk1iTWbnqk1qTYZNiueuTY5Nkk2WTZpNnk2iTabnsue2Tarnuue+58JNrk2yTbbnxk26Tb7nyufOTcJNxufSTcpNzk3STdZN2k3eTeJN5k3qTgZOCk4O59ZOEk4WThpOHk4iTiZOKk4uTjJONk46Tj5OQk5GTkpOTk5STlZOWk5eTmJOZk5qTm5Ock52TnpOfk6CToZOik6OTpJOlk6aTp5Ook6m59rn3k6qTq7n4k6yTrbn5ufqTrrn7k6+TsJOxk7KTs7n8uf2TtLn+k7W6obqik7aTt5O4k7mTurqjuqSTu5O8uqWTvZO+uqa6p5O/k8CTwZPCk8OTxJPFuqi6qZPGuqq6q7qsk8eTyJPJk8qTy5PMuq26rpPNk866r5PPk9CT0bqwk9KT05PUk9WT1pPXk9iT2bqxk9q6srqzurST25Pck926tZPek9+6tpPgk+GT4rq3k+OT5JPlk+aT55Pok+mT6pPrk+yT7ZPuk++T8JPxk/KT85P0k/WT9pP3k/iT+bq4urm6upP6uruT+5P8k/26vJP+lEGUQpRDlESURZRGur26vpRHur+USLrAlEmUSpRLlEyUTZROusGUT5RQlFG6wpRSlFOUVJRVlFaUV5RYlFmUWpRhlGKUY5RklGWUZrrDlGeUaJRplGqUa5RslG26xJRulG+UcJRxlHKUc5R0lHWUdpR3lHiUeZR6lIGUgpSDlISUhZSGusWUh5SIlImUipSLlIyUjbrGuseUjpSPusiUkJSRlJK6yZSTlJSUlZSWlJeUmJSZusq6y5SalJuUnJSdlJ6Un5SglKGUopSjusyUpJSllKa6zZSnlKiUqZSqlKuUrJStlK6Ur5SwlLGUspSzlLSUtZS2lLeUuJS5lLqUu5S8lL26zrrPlL6Uv7rQlMCUwbrRutK607rUlMKUw5TElMWUxrrVutaUx7rXlMi62JTJlMqUy7rZutqUzLrblM2UzpTPlNCU0ZTSlNO63JTUlNWU1pTXlNiU2ZTalNuU3JTdlN663ZTflOCU4ZTilOOU5JTlut6U5pTnlOiU6ZTqlOuU7JTtlO6U75TwlPGU8pTzlPSU9ZT2lPeU+JT5lPqU+5T8lP2U/pVBlUK637rglUOVRLrhlUWVRpVHuuKVSJVJlUqVS5VMlU2VTpVPlVCVUZVSlVO645VUlVWVVpVXlViVWbrklVqVYZViuuWVY5VklWW65pVmlWeVaJVplWqVa5VsuueVbZVuuuiVb7rplXCVcZVylXOVdJV1uuq665V2lXe67JV4lXmVerrtlYGVgpWDlYSVhZWGlYe67rrvlYi68JWJlYqVi5WMlY2VjpWPlZCVkZWSlZOVlJWVlZaVl5WYlZmVmpWblZyVnZWelZ+VoJWhlaKVo5WklaWVppWnlaiVqZWqlauVrLrxuvKVrZWuuvOVr5WwlbG69JWyuvWVs5W0lbWVtpW3uva695W4uviVubr5uvq6+5W6lbuVvJW9uvy6/ZW+lb+6/pXAlcGVwruhlcO7opXElcWVxpXHlci7o7uklcm7pbumu6eVypXLlcyVzZXOu6i7qbuqlc+V0LurldGV0pXTu6yV1JXVldaV15XYldmV2rutu66V27uvu7C7sZXcld2V3pXfleCV4buyu7OV4pXjleSV5ZXmleeV6JXpleqV65Xsle2V7pXvu7SV8JXxlfKV85X0lfWV9pX3lfiV+ZX6lfuV/JX9lf6WQZZClkOWRJZFlkaWR5ZIlkmWSpZLlkyWTZZOlk+WUJZRllKWU5ZUllWWVpZXlli7tbu2llmWWru3lmGWYru4u7mWY5ZklmWWZpZnlmiWabu6lmqWa7u7u7y7vZZslm2WbpZvlnCWcbu+lnKWc5Z0lnWWdpZ3lniWeZZ6loGWgpaDloSWhZaGloeWiJaJloqWi7u/loyWjZaOlo+WkJaRu8C7wZaSlpOWlJaVlpaWl5aYlpmWmpablpyWnZaelp+7wrvDlqC7xLvFu8aWoZailqOWpJallqaWp5aolqmWqparlqyWrZaulq+WsJaxlrKWs5a0lrWWtpa3lriWuZa6lruWvJa9lr6Wv5bAlsGWwrvHu8iWw5bEu8mWxZbGlse7ypbIlsmWypbLlsyWzZbOu8u7zJbPltCW0bvNltKW05bUltWW1pbXltiW2ZbaltuW3Jbdlt6W35bgluGW4pbjluSW5ZbmlueW6JbpluqW65bslu2W7pbvlvCW8ZbylvOW9Jb1lvaW95b4lvmW+pb7lvyW/Zb+l0GXQpdDl0SXRZdGl0eXSJdJl0qXS5dMl02XTpdPl1CXUbvOl1KXU5dUl1WXVpdXl1iXWZdal2GXYpdjl2SXZZdml2eXaJdpl2qXa5dsl22Xbpdvl3CXcZdyu8+Xc5d0l3WXdpd3l3iXeZd6l4GXgpeDl4SXhZeGl4eXiJeJl4qXi5eMu9CXjZeOl4+XkJeRl5K70bvSl5OXlLvTl5WXlpeXu9SXmJeZl5qXm5ecl52XnrvVl5+XoLvWl6G715eil6OXpJell6aXp5eol6mXqperl6yXrZeul6+XsJexl7KXs5e0l7WXtpe3l7iXuZe6l7uXvJe9l76Xv5fAl8GXwpfDl8SXxZfGl8eXyJfJl8qXy5fMl82XzpfPl9CX0ZfSl9OX1JfVl9aX15fYl9mX2pfbl9yX3Zfel9+X4Jfhl+KX45fkl+WX5pfnl+iX6Zfql+uX7Jftl+6X75fwl/GX8pfzl/SX9Zf2l/eX+Jf5l/qX+7vYl/yX/Zf+mEGYQphDmESYRZhGmEeYSJhJmEqYS5hMmE2YTphPmFCYUbvZmFKYU5hUmFWYVphXu9qYWJhZmFq725hhmGKYY7vcmGSYZZhmmGeYaJhpmGq73bvemGuYbJhtmG6Yb5hwmHGYcphzmHSYdZh2mHeYeJh5mHqYgZiCmIOYhJiFmIaYh5iImImYipiLmIyYjZiOmI+YkJiRmJKYk5iUmJWYlrvfu+CYl5iYu+GYmZiamJu74picmJ2YnpifmKCYoZiiu+O75Jiju+WYpLvmmKWYppinmKiYqZiqu+e76Jiru+m76pismK2767vsu+277piumK+YsJixmLK777vwmLO78bvyu/OYtJi1mLa79Ji3mLi79bv2mLmYurv3mLuYvJi9u/iYvpi/mMCYwZjCmMOYxLv5u/qYxbv7u/y7/ZjGmMeYyJjJmMqYy7v+vKGYzJjNvKKYzpjPmNC8o5jRmNKY05jUmNWY1pjXvKS8pZjYvKaY2bynmNqY25jcmN2Y3pjfvKiY4JjhmOK8qZjjmOSY5byqmOaY55jomOmY6pjrmOy8q5jtmO6Y75jwvKyY8ZjymPOY9Jj1mPa8rbyuvK+8sLyxmPeY+LyyvLOY+by0vLWY+pj7mPyY/by2vLeY/ry4vLm8uplBmUKZQ5lEvLuZRby8vL2ZRplHvL6ZSJlJmUq8v5lLmUyZTZlOmU+ZUJlRvMC8wZlSvMK8w7zEmVOZVJlVmVaZV5lYvMW8xplZmVq8x5lhmWKZY7zImWSZZZlmmWeZaJlpmWq8ybzKmWu8y7zMvM2ZbJltmW6Zb5lwmXG8zplymXOZdLzPmXWZdpl3vNCZeJl5mXqZgZmCmYOZhJmFmYaZh5mImYm80ZmKmYuZjJmNmY6Zj7zSvNO81JmQvNWZkZmSmZO81pmUvNeZlZmWmZeZmJmZvNi82ZmavNqZm7zbmZyZnZmevNyZn5mgvN283pmhmaK835mjmaSZpbzgmaaZp5momamZqpmrmayZrZmuma+ZsJmxvOGZspmzmbSZtZm2mbe84pm4mbmZurzjmbuZvJm9vOSZvpm/mcCZwZnCmcOZxLzlmcWZxrzmvOeZx5nImcmZypnLmcyZzbzomc6Zz5nQvOmZ0ZnSmdO86pnUmdWZ1pnXmdiZ2ZnavOu87JnbvO2Z3Jndmd6Z35ngmeGZ4pnjvO6875nkmeW88JnmmeeZ6LzxmemZ6pnrmeyZ7Znume+88rzzmfC89JnxvPWZ8pnzmfSZ9Zn2mfe89rz3mfiZ+bz4mfqZ+7z5vPqZ/Jn9mf6aQZpCmkOaRLz7vPyaRbz9mka8/ppHvaGaSL2ivaOaSb2kmkqaS5pMmk2aTppPmlCaUZpSmlOaVJpVmlaaV5pYmlmaWpphmmK9pZpjmmSaZZpmmmeaaJppvaa9p5pqmmu9qJpsmm2abr2pmm+acJpxmnKac5p0mnW9qpp2mneaeJp5vauaepqBmoKag5qEmoW9rL2tmoaah72umoiaiZqKva+ai5qMmo2ajpqPmpCakb2wvbGakr2ympO9s5qUmpWalpqXmpiamb20vbWampqbmpyanZqemp+9tpqgmqGaopqjmqSapZqmvbeap5qovbiaqb25mqqaq5qsmq2arpqvvbq9u5qwmrG9vJqymrOatL29vb6atZq2mreauJq5mrq9v73Amru9wZq8vcKavZq+mr+awJrBmsKaw5rEmsWaxprHmsiayZrKmsuazJrNms6az5rQmtGa0prTmtSa1ZrWmtea2JrZmtqa25rcmt2a3r3DvcSa35rgvcWa4Zrivca9x5rjmuSa5Zrmmuea6L3Ivcm9yprpvcua6r3Mmuua7Jrtmu69zZrvvc69z5rwvdC90ZrxmvKa873SmvSa9Zr2mvea+Jr5mvq9073Umvua/L3Vvdaa/Zr+m0GbQptDvde92L3Zm0SbRb3am0abR5tIvdubSZtKm0ubTJtNm06bT73cvd2bUJtRvd6935tSm1ObVJtVm1abV5tYm1mbWpthm2KbY5tkm2WbZptnm2ibaZtqm2ubbJttm26bb5twm3Gbcr3gm3ObdJt1m3abd5t4m3mbepuBm4Kbg5uEm4WbhpuHm4ibiZuKm4ubjJuNm46bj5uQm5GbkpuTm5SblZuWm5ebmJuZm5q94b3im5ubnL3jm52bnpufveSboL3lm6Gbopujm6Sbpb3mveebppunvei96Zuom6mbqpurm6ybrb3qm66br5uwveubsZuym7O97Ju0m7Wbtpu3m7ibuZu6m7ubvJu9m76bv5vAm8GbwpvDm8SbxZvGm8ebyJvJm8qby5vMm82bzpvPm9Cb0ZvSm9Ob1JvVm9ab15vYm9mb2pvbm9yb3Zvem9+b4Jvhm+Kb45vkm+Wb5r3tm+eb6Jvpm+qb65vsm+2b7pvvm/Cb8Zvym/Ob9Jv1m/ab95v4m/mb+pv7m/yb/b3uve+b/pxBvfCcQpxDvfG98pxEvfOcRZxGnEecSJxJvfS99ZxKnEucTL32nE2cTpxPnFCcUZxSvfe9+JxTnFS9+ZxVnFacV5xYnFmcWpxhnGKcY5xknGWcZpxnnGicab36nGqca5xsnG2cbpxvnHC9+5xxnHKcc5x0nHWcdpx3nHiceZx6nIGcgpyDnISchZyGnIeciJyJvfycipyLnIycjZyOnI+ckL39nJGckpyTvf6clJyVnJa+oZyXnJicmZyanJucnJydvqK+o5yenJ+coJyhnKKco5yknKWcppynvqScqJypnKqcq5ysnK2crpyvnLCcsZyynLOctJy1nLact5y4nLmcupy7nLycvZy+nL+cwJzBnMK+pb6mnMOcxL6nnMWcxpzHvqicyJzJnMqcy5zMnM2czr6pvqqcz5zQnNG+q5zSnNOc1JzVnNac176snNic2ZzanNuc3JzdnN6c35zgnOGc4pzjnOSc5ZzmnOec6JzpnOq+rZzrnOyc7ZzunO+c8Jzxvq6c8pzznPSc9Zz2nPec+Jz5nPqc+5z8nP2c/p1BnUKdQ51EnUWdRp1HnUidSZ1KnUudTJ1NnU6+r51PnVCdUb6wnVKdU51UnVWdVp1XnVidWZ1anWGdYp1jnWSdZZ1mnWedaJ1pnWqda51snW2dbp1vnXCdcZ1ynXOddJ11nXadd514nXmdep2BnYKdg52EnYWdhp2HnYidib6xnYqdi52MnY2djp2PvrK+s52QnZG+tJ2SnZOdlL61nZW+tp2WnZedmJ2Zvre+uL65nZqdm52cnZ2dnp2fnaCdoZ2inaO+up2knaWdpr67naedqJ2pvrydqp2rnaydrZ2una+dsL69nbGdsp2znbSdtZ22nbeduJ25nbqdu76+vr+dvJ29vsCdvp2/ncC+wZ3BncKdw53EncWdxp3HvsK+w53IvsSdyb7Fncqdy53Mnc2dzp3Pvsa+x53QndG+yL7Jvsqd0r7Lvsy+zZ3TndSd1Z3Wvs6+z77Qnde+0b7SvtOd2J3Zndq+1L7Vndu+1r7Xndyd3b7Ynd6d353gvtmd4Z3ineOd5J3lnead577avtud6L7cvt2+3p3pneqd653sne2d7r7fvuCd753wvuGd8Z3ynfO+4p30nfW+4532nfed+J35vuS+5Z36vuad+77nnfyd/Z3+vuieQb7pvuqeQp5DnkS+655FnkaeR77snkieSZ5KnkueTJ5Nnk6eT77tnlCeUZ5SnlOeVJ5VnlaeV55Ynlm+7r7vnlqeYb7wvvGeYr7yvvO+9L71nmOeZJ5lnmaeZ772vve++L75vvq++778nmi+/Z5pvv6ear+hv6Kea55sv6OebZ5unm+/pJ5wnnGecp5znnSedZ52v6W/pp53v6eeeL+onnmeep6BnoKeg56Ev6m/qr+rnoW/rJ6GnoeeiL+tnom/rr+vnoqei56Mno2/sL+xv7K/s7+0v7Wejp6PnpC/tr+3v7i/uZ6RnpKek7+6npSelZ6Wv7uel56Ynpmemp6bnpyenb+8v72enr++v7+en56gnqGeop6jnqSepb/Av8Gepp6nv8KeqJ6pnqq/w7/Ev8Weq7/Gnqyerb/Hv8i/yZ6uv8qer7/LnrC/zJ6xnrKes560v82/zp61nra/z563nrieub/Qnrqeu568nr2evp6/nsC/0b/SnsG/07/Uv9Wewp7DnsSexZ7Gnse/1r/Xnsieyb/Ynsqey57Mns2ezp7PntCe0Z7SntOe1L/ZntWe1r/ante/257Yntme2p7bntye3b/cv92e3p7fv96e4J7hnuK/357jnuSe5Z7mnuee6J7pv+C/4Z7qv+Ke67/jnuye7Z7unu+e8J7xv+S/5Z7ynvO/5p70nvWe9r/nnvee+J75nvqe+578nv2/6L/pnv6/6p9Bv+ufQp9Dn0SfRZ9Gn0e/7L/tn0ifSb/un0qfS59Mv++/8L/xn02fTp9Pn1CfUb/yv/OfUr/0n1O/9Z9Un1WfVp9Xn1ifWb/2v/efWp9hv/ifYp9jn2S/+Z9ln2afZ59on2mfap9rv/q/+59sn22//L/9n26fb59wn3Gfcp9zv/7AoZ90n3XAop92n3efeMCjn3mfep+Bn4Kfg5+En4XApMCln4afh5+IwKafiZ+Kn4ufjJ+Nn47Ap8Con4+fkMCpn5Gfkp+TwKqflJ+Vn5afl5+Yn5mfmsCrwKyfm8Ctn5zArp+dn56fn5+gn6GfosCvwLCfo5+kwLGfpZ+mn6fAsp+on6mfqp+rn6yfrZ+uwLPAtJ+vwLWfsMC2n7HAt5+yn7OftJ+1wLjAuZ+2n7fAup+4n7mfusC7n7ufvJ+9n76fv8C8n8DAvcC+n8HAv5/CwMDAwcDCwMPAxMDFwMbAx5/Dn8SfxcDIn8afx5/IwMmfyZ/Kn8ufzJ/Nn86fz8DKn9Cf0cDLn9Kf05/Un9Wf1p/Xn9if2cDMwM2f2p/bwM6f3J/dn97Az8DQwNGf35/gn+Gf4sDSwNPA1J/jwNXA1sDXwNif5J/ln+bA2Z/nwNrA25/on+nA3J/qwN3A3sDfn+vA4J/sn+2f7p/vn/DA4cDin/HA48DkwOXA5p/yn/Of9J/1n/bA58Don/ef+MDpn/mf+p/7wOqf/J/9n/6gQaBCoEOgRMDrwOygRcDtwO7A76BGoEegSKBJoEqgS8DwwPGgTKBNwPKgTsDzoE/A9KBQoFGgUqBToFSgVaBWwPWgV6BYoFmgWsD2oGGgYqBjoGSgZaBmwPegZ6BooGnA+KBqoGugbMD5oG2gbqBvoHCgcaByoHOgdKB1oHagd6B4oHmgeqCBoIKgg6CEoIXA+sD7oIagh8D8oIigiaCKwP2gi8D+oIygjaCOoI+gkMGhwaKgkcGjoJLBpMGloJOglKCVoJagl8GmwaegmKCZwaigmqCboJzBqaCdoJ6gn6CgoKGgoqCjwarBq6CkwaygpcGtoKagp6CooKmgqqCrwa6grKCtoK7Br6CvoLCgscGwoLKgs6C0oLWgtqC3oLjBscGyoLmgusGzwbSgu6C8oL2gvqC/oMDBtaDBoMKgw6DEoMWgxqDHoMigyaDKoMugzKDNoM6gz6DQoNGg0qDToNSg1aDWoNeg2KDZoNqg28G2wbeg3KDdwbig3qDfoODBuaDhwbqg4qDjoOSg5aDmwbvBvKDnwb2g6MG+wb/BwKDpoOqg68HBwcLBw6DsoO2g7qDvoPCg8cHEoPKg86D0oPWg9qD3oPig+cHFoPrBxqD7wceg/KD9oP6hQaFCoUPByKFEoUWhRqFHoUihSaFKoUuhTKFNoU6hT6FQoVGhUqFToVShVaFWwcnByqFXoVihWaFaoWGhYsHLoWOhZKFlwcyhZqFnoWjBzaFpoWqha6FsoW2hbqFvwc7Bz6FwwdChccHRoXKhc6F0oXWhdqF3wdLB06F4oXnB1KF6oYGhgqGDoYShhaGGoYehiKGJoYqhi6GMoY2hjqGPwdWhkKGRoZKhk6GUoZXB1sHXoZahl8HYoZihmaGawdnB2sHboZuhnKGdoZ6hn8Hcwd2hoMHeokHB36JCokOiRKJFokaiR8HgokiiSaJKokuiTKJNok6iT6JQolGiUqJTolSiVaJWoleiWKJZolrB4aJhomKiY6JkomWiZqJnweKiaKJpomqia6Jsom2ibqJvonCicaJyonOidKJ1onaid6J4onmieqKBooKig6KEooWihqKHoojB48HkoomiisHloouijKKNweaijqKPopCikaKSopOilMHnweiilcHpopail6KYopmimqKbopyincHqop6in6KgweujQaNCo0PB7KNEo0WjRqNHo0ijSaNKwe2jS6NMo02jTqNPo1CjUaNSo1OjVKNVwe7B76NWo1fB8KNYo1mjWsHxo2GjYqNjo2SjZaNmo2fB8sHzo2jB9KNpwfWjaqNro2yjbaNuo2+jcKNxo3Kjc6N0o3WjdqN3o3ijeaN6o4GjgqODo4SjhaOGo4ejiKOJo4qji6OMo42jjqOPo5CjkcH2wfejkqOTwfijlKOVwfnB+qOWwfujl6OYo5mjmqObwfzB/aOcwf6jncKhwqKjnqOfwqPCpKOgwqXCpqRBpELCp6RDwqikRMKppEWkRsKqpEekSKRJpErCq8KspEvCrcKuwq+kTKRNpE6kT6RQpFHCsMKxpFKkU8KypFSkVaRWwrOkV6RYpFmkWqRhpGKkY8K0wrWkZMK2wrfCuKRlpGakZ6RopGmkasK5pGukbKRtwrqkbqRvpHCkcaRypHOkdKR1pHakd6R4pHmkeqSBpIKkg8K7pISkhaSGpIekiKSJpIqki6SMpI2kjqSPpJCkkaSSpJOklKSVpJakl6SYpJmkmqSbpJyknaSepJ+koKVBpUKlQ6VEpUXCvMK9pUalR8K+pUilSaVKwr+lS6VMpU2lTqVPpVClUcLAwsGlUsLCwsPCxKVTpVSlVaVWpVelWMLFpVmlWqVhpWKlY6VkpWWlZqVnpWilaaVqpWulbKVtpW6lb6VwpXGlcsLGpXOldKV1pXald6V4wseleaV6pYGlgqWDpYSlhaWGpYeliKWJpYqli6WMpY2ljqWPpZClkcLIpZKlk6WUpZWllqWXpZilmaWapZulnKWdpZ6ln6WgpkGmQqZDpkSmRaZGpkemSKZJpkqmS6ZMpk2mTqZPplCmUaZSplOmVMLJwsqmVaZWwsumV6ZYplnCzKZapmGmYqZjpmSmZaZmws3CzqZnws+maMLQpmnC0aZqpmumbKZtwtLC06Zupm+mcKZxpnKmc8LUpnSmdaZ2pnemeKZ5pnqmgaaCpoOmhMLVpoWmhqaHpoimiaaKpovC1qaMpo2mjqaPppCmkaaSppOmlKaVppaml6aYppmmmqabppymnaaewtemn6agp0GnQqdDp0SnRcLYp0anR6dIwtmnSadKp0vC2qdMp02nTqdPp1CnUadSwtvC3KdTp1SnVadWp1enWKdZp1qnYadip2OnZKdlp2anZ6dop2mnaqdrp2ynbadup2+ncKdxp3Knc6d0p3Wndqd3wt2neKd5p3qngaeCp4PC3sLfp4SnhcLgp4anh6eIwuGniaeKp4unjKeNp46nj8LiwuOnkKeRp5LC5KeTp5SnlaeWp5enmMLlp5mnmqebp5ynnaeep5+noKhBqEKoQ6hEqEWoRqhHqEioSahKqEvC5sLnqEyoTahOqE+oUKhRqFKoU6hUqFWoVqhXqFioWahaqGGoYqhjqGSoZahmqGeoaKhpqGqoa6hsqG2obqhvqHCocahyqHPC6Kh0qHWodqh3qHioeah6qIGogqiDqISohaiGqIeoiKiJqIqoi6iMqI2ojqiPqJCokaiSqJOolMLpqJWolqiXqJiomaiaqJuonKidqJ6on6igqUGpQqlDqUSpRalGqUepSKlJqUqpS6lMqU2pTqlPwuqpUKlRqVKpU6lUqVWpVqlXqVipWalaqWGpYqljqWTC66llqWbC7Klnwu2paKlpqWqpa6lsqW2pbqlvqXCpcalyqXOpdKl1qXapd6l4qXmpeqmBqYKpg6mEqYWphqmHqYipiamKqYupjKmNqY6pj8Luwu+pkKmRwvCpkqmTqZTC8amVqZapl6mYqZmpmqmbwvLC86mcqZ2pnsL0wvWpn6mgqkGqQsL2wvfC+KpDqkTC+apFwvqqRsL7qkeqSKpJqkqqS6pMqk3C/ML9qk7C/sOhw6LDo6pPqlCqUapSqlPDpMOlqlSqVcOmqlaqV6pYw6eqWapaqmGqYqpjqmSqZcOow6mqZsOqw6vDrKpnqmiqaapqqmuqbMOtqm2qbqpvw66qcMOvqnHDsKpyqnOqdKp1qnaqd6p4w7Gqeap6qoGqgsOyqoOqhKqFqoaqh6qIqomqiqqLqoyqjaqOqo+qkKqRqpKqk6qUqpWqlqqXqpiqmaqaqpuqnKqdqp6qn6qgq0GrQqtDq0TDs8O0q0WrRsO1q0erSKtJw7arSqtLq0yrTatOq0+rUMO3w7irUcO5w7rDu6tSq1OrVKtVq1arV8O8w72rWKtZw76rWqthq2LDv6tjq2SrZatmq2eraKtpw8DDwatqw8Kra8PDq2yrbatuq2+rcKtxw8Srcqtzq3TDxat1q3ard6t4q3mrequBq4Krg6uEq4WrhquHq4iricPGq4qri6uMq42rjquPq5DDx6uRq5Krk8PIq5SrlauWq5ermKuZq5qrm6ucq52rnqufq6CsQaxCrEPDyaxErEWsRqxHrEisScPKw8usSqxLw8ysTKxNrE7DzaxPrFCsUaxSrFOsVKxVw87Dz6xWw9CsV8PRrFisWaxarGGsYqxjw9KsZKxlrGbD06xnrGisacPUrGqsa6xsrG2sbqxvrHCscaxyrHOsdKx1w9Wsdqx3rHiseax6rIGsgqyDrISshayGrIesiKyJrIqsi6yMrI2sjqyPrJCskaySrJOslKyVrJasl6yYrJmsmqybrJysncPWrJ6sn6ygw9etQa1CrUPD2K1ErUWtRq1HrUitSa1Kw9nD2q1Lw9utTMPcrU2tTq1PrVCtUa1Sw92tU61UrVWtVq1XrVitWa1arWGtYq1jrWStZa1mrWfD3q1orWmtaq1rrWytba1urW+tcK1xrXLD38PgrXOtdMPhrXWtdq13w+KteK15rXqtga2CrYOthMPjw+SthcPlrYbD5q2HrYitia2KrYutjMPnrY2tjq2PrZCtka2SrZOtlK2VrZatl62YrZmtmq2brZytna2erZ/D6K2grkGuQq5DrkSuRa5Gw+muR65IrknD6q5KrkuuTK5Nrk6uT65QrlGuUq5TrlSuVa5WrleuWK5ZrlquYa5irmOuZK5lrmbD665nrmiuacPsrmqua65sw+2uba5urm+ucK5xrnKuc8Puw++udMPwrnXD8a52rneueK55rnqugcPyroKug66Ew/Ouha6GrofD9K6Iromuiq6Lroyuja6Ow/Wuj66QrpGuksP2rpOulK6Vrpaul66Yw/fD+K6ZrprD+a6brpyuncP6rp6un66gr0GvQq9Dr0TD+8P8r0XD/a9Gw/6vR69Ir0mvSq9Lr0yvTa9Or0+vUK9Rr1KvU69Ur1WvVq9Xr1ivWa9ar2GvYq9jr2SvZa9mr2evaK9pr2qva69sr22vbsShxKKvb69wxKOvca9yxKTEpcSmr3OvdK91r3avd694xKfEqK95xKmvesSqr4Gvgq+Dr4Svha+GxKvErK+Hr4jEra+Jr4qvi8Sur4yvja+Or4+vkK+Rr5LEr8Swr5PEsa+UxLKvla+Wr5evmK+Zr5rEs8S0r5uvnMS1r52vnq+fxLavoLBBsEKwQ7BEsEWwRsS3xLiwR8S5xLrEu7BIsEmwSrBLsEywTcS8xL2wTrBPsFCwUbBSsFOwVLBVsFawV7BYsFmwWrBhsGKwY7BksGWwZsS+sGewaLBpsGqwa7BssG2wbrBvsHCwcbBysHOwdLB1sHawd7B4sHmwerCBsIKwg7CEsIWwhrCHsIiwibCKsIuwjLCNsI7Ev8TAsI+wkMTBsJGwksTCxMOwk7CUsJWwlrCXsJiwmcTExMWwmsTGxMfEyLCbsJywnbCesJ+woMTJxMqxQbFCxMuxQ7FEsUXEzLFGsUexSLFJsUqxS7FMxM3EzrFNxM+xTsTQsU+xULFRsVKxU7FUxNGxVbFWsVfE0rFYsVmxWsTTsWGxYrFjsWSxZbFmsWfE1MTVsWjE1sTXxNixabFqsWuxbLFtsW7E2bFvsXCxcbFysXOxdLF1sXaxd7F4sXmxerGBsYKxg7GEsYWxhrGHsYixibGKsYuxjLGNsY6xj8TaxNuxkLGRxNyxkrGTsZTE3bGVsZaxl7GYsZmxmrGbxN7E37GcxOCxncThsZ6xn7GgskGyQrJDxOLE47JEskXE5LJGskeySMTlskmySrJLskyyTbJOsk/E5rJQslGyUrJTxOeyVLJVslayV7JYslnE6LJasmGyYrJjsmSyZbJmsmeyaLJpsmqya7Jssm2ybrJvsnCycbJysnPE6bJ0snWydrJ3sniyecTqsnqygbKCsoOyhLKFsobE67KHsoiyibKKsouyjLKNso6yj7KQspGykrKTspSylbKWspeymLKZxOyymrKbspyynbKesp+yoLNBs0KzQ7NEs0WzRrNHs0izSbNKs0uzTLNNs06zT7NQs1GzUrNTs1TE7cTus1WzVsTvs1ezWLNZxPCzWrNhs2KzY7Nks2WzZsTxxPKzZ8Tzs2jE9LNps2qza7Nss22zbsT1s2+zcLNxxPazcrNzs3TE97N1s3azd7N4s3mzerOBs4Kzg7OEs4WzhsT4s4eziLOJs4qzi7OMxPmzjbOOs4+zkLORs5Kzk7OUs5WzlrOXs5izmbOas5uznLOds56zn7OgxPq0QbRCtEO0RLRFtEbE+8T8tEe0SMT9tEm0SrRLxP60TLRNtE60T7RQtFG0UsWhxaK0U8WjtFTFpLRVtFa0V7RYtFm0WsWltGG0YrRjxaa0ZLRltGbFp7RntGi0abRqtGu0bLRtxai0brRvtHC0cbRytHO0dLR1tHa0d7R4xanFqrR5tHrFq7SBtIK0g8WstIS0hbSGtIe0iLSJtIrFrcWutIu0jLSNxa+0jrSPtJC0kbSStJO0lLSVtJa0l7SYtJm0mrSbtJy0nbSetJ+0oLVBtUK1Q7VEtUW1RrVHtUi1SbVKtUu1TLVNtU61T8WwxbG1ULVRxbK1UrVTtVTFs7VVtVa1V7VYtVm1WrVhxbTFtbVixba1Y8W3tWS1ZbVmtWe1aLVpxbjFubVqtWvFurVstW21bsW7xby1b7VwtXG1crVztXTFvcW+tXXFv8XAxcG1drV3tXi1ebV6tYHFwsXDtYK1g8XEtYS1hbWGxcW1h7WItYm1irWLtYy1jcXGxce1jsXIxcnFyrWPtZC1kbWStZO1lMXLtZW1lrWXtZi1mbWatZu1nLWdtZ61n7WgtkG2QrZDtkS2RbZGtke2SMXMtkm2SrZLtky2TbZOtk+2ULZRtlK2U7ZUtlW2VrZXtli2WbZatmG2YrZjtmS2ZbZmtme2aLZptmq2a7Zstm22brZvtnDFzcXOtnG2csXPtnO2dLZ1xdC2dsXRtne2eLZ5tnq2gcXSxdO2gsXUxdXF1raDtoS2hbaGtoe2iMXXxdi2ibaKxdm2i7aMto3F2raOto+2kLaRtpK2k7aUxdvF3LaVxd22lsXetpe2mLaZtpq2m7acxd+2nbaetp/F4Lagt0G3QrdDt0S3RbdGt0e3SLdJt0q3S7dMt023TsXht0+3ULdRt1K3U7dUt1XF4rdWt1e3WMXjt1m3Wrdht2K3Y7dkt2W3Zrdnt2i3abdqt2u3bLdtt263b7dwt3G3crdzt3S3dcXkxeW3drd3xea3eLd5t3rF57eBt4K3g7eEt4W3hreHxejF6beIxeq3icXrt4q3i7eMt43F7LeOxe23j7eQt5HF7reSt5O3lLeVt5a3l7eYt5m3mrebt5y3nbeet5+3oLhBuEK4Q7hEuEW4RrhHuEjF77hJuEq4S7hMuE24TrhPuFC4UbhSuFO4VLhVuFa4V7hYuFm4WrhhuGK4Y7hkuGW4ZrhnuGi4acXwuGq4a7hsxfG4bbhuuG+4cLhxuHK4c7h0uHW4drh3uHi4ebh6xfK4gcXzuIK4g7iEuIW4hriHxfS4iLiJuIq4i7iMuI24jriPuJC4kbiSuJO4lLiVuJa4l7iYuJm4mribuJy4nbieuJ+4oLlBuULF9cX2uUO5RMX3uUW5RrlHxfi5SLlJuUq5S7lMuU25TsX5xfq5T8X7uVDF/LlRuVK5U7lUuVW5VsX9uVe5WLlZuVq5YbliuWO5ZLlluWa5Z7louWm5arlruWy5bbluuW/F/rlwuXG5crlzuXS5dbl2xqG5d7l4uXm5ermBuYK5g7mEuYW5hrmHuYi5ibmKuYu5jLmNuY65j7mQuZG5krmTuZS5lbmWuZfGosajuZi5mcakuZq5m7mcxqW5nbmeuZ+5oLpBukK6Q8amxqe6RLpFukbGqLpHuki6SbpKuku6TMapuk26TrpPxqq6ULpRulLGq7pTulS6VbpWule6WLpZxqy6WrphumK6Y8atumS6Zbpmume6aLppxq7Gr7pqumvGsLpsum3Gscayum7Gs7pvunC6cbpyunPGtMa1unTGtrp1una6d7p4unm6erqBuoLGt7qDuoS6hca4uoa6h7qIxrm6ibqKuou6jLqNuo66j8a6xru6kLqRupK6k7qUupW6lrqXupi6mca8xr26mrqbxr66nLqdup7Gv7qfuqC7QbtCu0O7RLtFxsDGwbtGxsK7R8bDu0i7SbtKu0u7TLtNxsTGxcbGu07Gx7tPu1C7UcbIu1LGybtTu1S7VbtWu1fGysbLu1jGzMbNxs67Wbtau2HGz7tiu2PG0MbRu2S7ZcbSu2a7Z7toxtO7abtqu2u7bLttu267b8bUxtW7cMbWxtfG2Ltxu3K7c7t0u3W7dsbZxtq7d7t4u3m7eruBu4K7g7uEu4W7hruHu4i7ibuKu4u7jLuNu467j7uQu5G7kruTu5S7lbuWu5e7mLuZu5q7m7ucu527nrufu6C8QbxCvEO8RLxFvEa8R7xIvEm8SrxLvEy8TbxOvE+8ULxRvFLG28bcvFO8VMbdvFW8VrxXxt68WLxZvFq8YbxivGO8ZMbfxuC8ZcbhxuLG47xmvGe8aLxpvGq8a8bkxuW8bLxtxua8brxvvHDG57xxvHK8c7x0vHW8drx3xujG6bx4xuq8ecbrvHq8gbyCvIO8hLyFxuy8hryHvIjG7byJvIq8i8buvIy8jbyOvI+8kLyRvJLG78bwvJO8lMbxxvK8lbyWvJe8mLyZvJrG87ybvJy8nbyevJ+8oL1BxvS9Qr1DvUS9Rb1GvUe9SL1JxvW9Ssb2vUu9TL1NvU69T71QvVG9Usb3xvi9U71Uxvm9Vb1WvVfG+r1YvVm9Wr1hvWK9Y71kxvvG/L1lxv29Zsb+vWe9aL1pvWq9a71sx6G9bb1uvW+9cL1xvXK9c710vXW9dr13vXi9eb16vYG9gr2DvYS9hb2Gx6K9h72IvYm9ir2LvYy9jb2OvY+9kL2RvZK9k72UvZW9lr2XvZi9mb2avZu9nL2dvZ69n72gvkG+Qr5DvkS+Rb5Gvke+SMejvkm+Sr5Lx6S+TL5Nvk6+T75QvlG+Ur5TvlS+Vb5Wvle+WL5Zvlq+Yb5ivmO+ZL5lvma+Z75ox6W+ab5qvmvHpr5svm2+bsenvm++cL5xvnK+c750vnW+dseovnfHqb54vnm+er6BvoK+g76EvoXHqservoa+h8esvoi+icetx66+isevvou+jL6Nvo6+j8ewx7G+kMeyvpHHs76SvpO+lL6Vvpa+l8e0vpi+mb6avpu+nL6dvp6+n76gv0G/Qr9Dv0S/Rb9Gv0e/SL9Jv0q/S8e1v0y/Tb9Ov0+/UL9Rv1K/U79Uv1W/Vr9Xv1i/Wb9av2G/Yr9jv2S/Zb9mv2e/aL9pv2q/a79sv22/br9vv3C/cb9yv3PHtr90v3W/dse3v3e/eL95x7i/er+Bv4K/g7+Ev4W/hse5v4e/iMe6v4m/ir+Lv4y/jb+Ov4+/kMe7v5G/kr+Tx7y/lL+Vv5bHvb+Xv5i/mb+av5u/nL+dx76/nr+fx7+/oMfAwEHAQsBDwETARcBGx8HAR8BIwEnHwsBKwEvATMfDwE3ATsBPwFDAUcBSwFPHxMfFwFTHxsBVwFbAV8BYwFnAWsBhwGLAY8BkwGXAZsBnwGjAacBqwGvAbMBtwG7Ab8BwwHHAcsBzwHTAdcB2wHfAeMB5wHrAgcCCwIPAhMfHx8jAhcCGx8nAh8CIwInHysCKwIvAjMCNwI7Aj8CQx8vHzMCRx83AksfOwJPAlMCVwJbAl8CYx8/H0MCZwJrH0cCbwJzAncfSwJ7An8CgwUHH08FCwUPH1MfVwUTH1sFFx9fBRsFHwUjBScFKwUvH2MfZwUzBTcfawU7BT8FQx9vBUcFSwVPBVMFVwVbBV8fcx93BWMfex9/H4MFZwVrBYcFiwWPBZMfhwWXBZsFnwWjBacFqwWvBbMFtwW7Bb8FwwXHBcsFzwXTBdcF2wXfBeMfiwXnBesGBwYLBg8GEwYXBhsGHwYjBicGKwYvBjMGNwY7Bj8GQwZHBksGTwZTBlcGWwZfBmMGZwZrBm8GcwZ3BnsGfwaDH48fkwkHCQsflwkPCRMJFx+bCRsfnwkfCSMJJwkrCS8fox+nCTMfqwk3H68JOwk/CUMJRwlLCU8fsx+3CVMJVx+7CVsJXwljH78JZwlrCYcJiwmPCZMJlx/DH8cJmx/LCZ8fzwmjCacJqwmvCbMJtx/TH9cJuwm/H9sJwwnHCcsf3wnPCdMJ1wnbCd8J4wnnH+Mf5wnrH+sf7x/zCgcKCwoPChMKFwobH/cKHwojCicf+worCi8KMyKHCjcKOwo/CkMKRwpLCk8KUyKLClcKWwpfCmMKZwprCm8Kcwp3CnsijyKTCn8KgyKXDQcNCw0PIpsNEw0XDRsNHyKfDSMNJyKjIqcNKyKrDS8irw0zDTcNOyKzDT8NQyK3IrsNRw1LIr8NTw1TDVciww1bDV8NYw1nDWsNhw2LDY8Nkw2XIscNmyLLDZ8Now2nDasNrw2zIs8i0w23Dbsi1w2/DcMNxw3LDc8N0w3XDdsN3w3jDecN6w4HDgsi2w4PIt8OEw4XDhsOHw4jDici4yLnDisOLyLrDjMONw47Iu8OPw5DDkcOSw5PDlMOVw5bIvMOXyL3DmMi+w5nDmsObw5zDncOeyL/Dn8OgxEHIwMRCxEPERMjBxEXERsRHxEjEScRKxEvETMjCxE3Iw8ROxE/EUMRRxFLEU8RUxFXIxMjFxFbEV8jGxFjEWcRayMfEYcRixGPEZMjIxGXEZsjJxGfEaMjKxGnIy8RqxGvEbMRtxG7Eb8jMxHDEccRyyM3Ec8R0xHXIzsR2xHfEeMR5xHrEgcSCyM/Eg8SExIXEhsjQxIfEiMSJxIrEi8SMyNHI0sSNxI7I08SPxJDEkcjUxJLEk8SUxJXElsSXxJjEmcSaxJvEnMSdyNXEnsSfxKDFQcVCxUPI1sjXxUTFRcjYxUbFR8VIyNnFScVKxUvFTMVNxU7FT8jayNvFUMjcxVHI3cVSxVPFVMVVxVbFV8jeyN/FWMVZyODFWsVhxWLI4cVjxWTFZcVmxWfFaMVpyOLFasVryOPFbMjkxW3FbsVvxXDFccVyyOXI5sVzxXTI58V1yOjI6cjqyOvFdsV3xXjFecV6xYHI7MjtxYLI7sWDyO/FhMWFxYbI8MWHxYjI8cWJxYrFi8jyxYzFjcWOyPPFj8WQxZHFksWTxZTFlcj0yPXFlsWXxZjI9sWZxZrFm8WcxZ3Fnsj3yPjFn8WgyPnGQcZCxkPI+sZExkXGRsZHxkjGScZKyPvI/MZLyP3GTMj+xk3GTsZPxlDGUcZS";
const CP949_JAMO_B64 = "pKGkoqSjpKSkpaSmpKekqKSppKqkq6SspK2krqSvpLCksaSypLOktKS1pLakt6S4pLmkuqS7pLykvaS+pL+kwKTBpMKkw6TEpMWkxqTHpMikyaTKpMukzKTNpM6kz6TQpNGk0qTT";

// Base64 디코딩 → Uint8Array
function b64ToBytes(b64) {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

let _hangulMap = null;
let _jamoMap = null;

function getHangulMap() {
  if (!_hangulMap) {
    _hangulMap = b64ToBytes(CP949_HANGUL_B64);
  }
  return _hangulMap;
}

function getJamoMap() {
  if (!_jamoMap) {
    _jamoMap = b64ToBytes(CP949_JAMO_B64);
  }
  return _jamoMap;
}

/**
 * 유니코드 문자열 → CP949 바이트 배열
 */
function encodeCP949(str) {
  const result = [];
  const hangul = getHangulMap();
  const jamo = getJamoMap();
  
  for (let i = 0; i < str.length; i++) {
    const code = str.charCodeAt(i);
    
    // ASCII (0x00~0x7F)
    if (code <= 0x7F) {
      result.push(code);
    }
    // 한글 완성형 (가~힣: 0xAC00~0xD7A3)
    else if (code >= 0xAC00 && code <= 0xD7A3) {
      const idx = (code - 0xAC00) * 2;
      if (idx + 1 < hangul.length) {
        result.push(hangul[idx], hangul[idx + 1]);
      } else {
        result.push(0x3F); // ?
      }
    }
    // 한글 자모 (ㄱ~ㅣ: 0x3131~0x3163)
    else if (code >= 0x3131 && code <= 0x3163) {
      const idx = (code - 0x3131) * 2;
      if (idx + 1 < jamo.length) {
        result.push(jamo[idx], jamo[idx + 1]);
      } else {
        result.push(0x3F);
      }
    }
    // 일부 특수문자 매핑
    else {
      // CP949에 없는 문자 → ? 대체
      result.push(0x3F);
    }
  }
  
  return new Uint8Array(result);
}

/**
 * CP949 바이트를 URL 인코딩 (application/x-www-form-urlencoded용)
 */
function cp949UrlEncode(str) {
  const bytes = encodeCP949(str);
  let result = "";
  for (const b of bytes) {
    if (
      (b >= 0x30 && b <= 0x39) || // 0-9
      (b >= 0x41 && b <= 0x5A) || // A-Z
      (b >= 0x61 && b <= 0x7A) || // a-z
      b === 0x2D || b === 0x5F || b === 0x2E || b === 0x7E // - _ . ~
    ) {
      result += String.fromCharCode(b);
    } else {
      result += "%" + b.toString(16).toUpperCase().padStart(2, "0");
    }
  }
  return result;
}

// ============================================================
// 스팸필터 대체 용어
// ============================================================
const SPAM_REPLACEMENTS = [
  // 조사 결합 (선행 처리 - 순서 중요)
  ["보험료가", "월 납입금이"],
  ["보험료를", "월 납입금을"],
  ["보험료는", "월 납입금은"],
  ["보험료의", "월 납입금의"],
  ["보험료도", "월 납입금도"],
  ["보험료만", "월 납입금만"],
  ["보험료에", "월 납입금에"],
  ["보험료", "월 납입금"],
  ["자기부담금이", "본인 부담분이"],
  ["자기부담금을", "본인 부담분을"],
  ["자기부담금", "본인 부담분"],
  ["비급여", "건강보험 미적용 항목"],
  ["청구권", "신청 기한"],
  ["소멸시효", "신청 기한"],
  ["4세대 실손보험", "최신 의료비 상품"],
  ["3세대 실손보험", "3세대 실손"],
  ["2세대 실손보험", "2세대 실손"],
  ["1세대 실손보험", "1세대 실손"],
  ["국민건강보험", "건강보험"],
  ["보험금 청구", "보장 금액 신청"],
  ["보험금이", "보장 금액이"],
  ["보험금을", "보장 금액을"],
  ["보험금", "보장 금액"],
  ["보험 가입", "상품 가입"],
  ["보험에 가입", "상품에 가입"],
  ["보험을 가입", "상품을 가입"],
  ["보험사", "가입처"],
];

function applySpamFilter(text) {
  let result = text;
  for (const [from, to] of SPAM_REPLACEMENTS) {
    result = result.replaceAll(from, to);
  }
  // 금액/퍼센트 패턴 제거 (네이버 금융 스팸 트리거)
  result = sanitizeMoneyPatterns(result);
  // 보험 용어 밀도 제한
  result = limitKeywordDensity(result);
  return result;
}

/**
 * 금액/퍼센트 패턴 제거 - 네이버 금융 스팸 필터 우회
 * "100만 원 손해" → "상당한 금액" 류로 변환
 */
function sanitizeMoneyPatterns(text) {
  let result = text;
  // "100%" → 항상 제거
  result = result.replace(/100\s*%/g, "전부");
  // "X만 원" → 전부 제거 (금액 패턴 = 스팸 트리거)
  result = result.replace(/\d{1,4}만\s*원/g, "적지 않은 금액");
  // "X%" → 전부 제거
  result = result.replace(/\d{1,3}~?\d{0,3}%/g, "상당 수준");
  // "손해봅니다" "손해 봅니다"
  result = result.replace(/손해\s*봅니다/g, "아까울 수 있습니다");
  result = result.replace(/손해\s*볼\s*수/g, "부담이 커질 수");
  // "절감"
  result = result.replace(/절감/g, "줄일 수 있는");
  return result;
}

// 제목 전용 경량 필터 (밀도 제한/금액 제거 없이, 기본 용어 대체만)
function applySpamFilterLight(text) {
  let result = text;
  for (const [from, to] of SPAM_REPLACEMENTS) {
    result = result.replaceAll(from, to);
  }
  // 제목에서 금액/퍼센트 패턴 제거 (스팸 트리거)
  result = result.replace(/,?\s*연\s*\d+만\s*원[은는이가을를도]?\s*\S*/g, "");
  result = result.replace(/\d+만\s*원[은는이가을를도]?\s*(아껴|절약|절감|이득|세이브|줄일|줄어|아낄)\S*/g, "");
  result = result.replace(/\d+%\s*(할인|절약|절감|인하|인상|줄|아끼)\S*/g, "");
  result = result.replace(/\s{2,}/g, " ").trim();
  return result;
}

/**
 * 보험 용어 밀도 제한 - 네이버 스팸필터 우회
 * 매우 공격적 제한 - 각 용어 2~3회로 한정
 */
function limitKeywordDensity(text) {
  let result = text;

  // 1) "실손보험" → 2회만, 나머지 동의어
  const synSilson = ["실손", "의료실비", "의료비 보장"];
  let c1 = 0;
  result = result.replace(/실손보험/g, () => (++c1 <= 2 ? "실손보험" : synSilson[(c1-3) % synSilson.length]));

  // 2) 독립 "실손" → 3회까지만
  const synSilsonOnly = ["의료실비", "의료비", "실비"];
  let c1b = 0;
  result = result.replace(/(?<!의료)실손(?!보험)/g, () => (++c1b <= 3 ? "실손" : synSilsonOnly[(c1b-4) % synSilsonOnly.length]));

  // 3) "암보험" → 2회만
  let c2 = 0;
  result = result.replace(/암보험/g, () => (++c2 <= 2 ? "암보험" : "암 보장 상품"));

  // 4) "자동차보험" → 2회만
  let c3 = 0;
  result = result.replace(/자동차보험/g, () => (++c3 <= 2 ? "자동차보험" : "자동차 상품"));

  // 5) "연금보험" → 2회만
  let c4 = 0;
  result = result.replace(/연금보험/g, () => (++c4 <= 2 ? "연금보험" : "노후 대비 상품"));
  // 연금저축 밀도 제한
  let c4b = 0;
  result = result.replace(/연금저축/g, () => (++c4b <= 2 ? "연금저축" : "세제혜택 저축"));

  // 6) "태아보험" → 2회만
  let c5 = 0;
  result = result.replace(/태아보험/g, () => (++c5 <= 2 ? "태아보험" : "태아 상품"));

  // 7) "갱신" → 2회만, 나머지 다양한 동의어
  const synGaeng = ["재계약", "만기 도래", "기간 종료 시"];
  let c6 = 0;
  result = result.replace(/갱신/g, () => (++c6 <= 2 ? "갱신" : synGaeng[(c6-3) % synGaeng.length]));

  // 8) "가입" → 2회만
  let c7 = 0;
  result = result.replace(/가입/g, () => (++c7 <= 2 ? "가입" : "계약"));

  // 9) "보장" → 2회만
  let c8 = 0;
  result = result.replace(/보장/g, () => (++c8 <= 2 ? "보장" : "혜택"));

  // 10) 남은 "보험" 총 3회 이하
  const totalIns = (result.match(/보험/g) || []).length;
  if (totalIns > 3) {
    let seen = 0;
    result = result.replace(/보험/g, () => (++seen <= 3 ? "보험" : "상품"));
  }

  // 11) "납입" → 2회만
  let c9 = 0;
  result = result.replace(/납입/g, () => (++c9 <= 2 ? "납입" : "부담"));

  // 12) "인상" → 2회만
  let c10 = 0;
  result = result.replace(/인상/g, () => (++c10 <= 2 ? "인상" : "변동"));

  // 13) "특약" → 1회만
  let c11 = 0;
  result = result.replace(/특약/g, () => (++c11 <= 1 ? "특약" : "추가 항목"));

  // 14) "재계약" → 3회만 (갱신→재계약 변환 후 과다 방지)
  let c12 = 0;
  result = result.replace(/재계약/g, () => (++c12 <= 3 ? "재계약" : "만기 시"));

  // 15) "자동차" (독립) → 3회만
  let c13 = 0;
  result = result.replace(/자동차(?!보험|상품)/g, () => (++c13 <= 3 ? "자동차" : "차량"));

  // 16) "운전자" → 3회만
  const synDriver = ["운전하는 분", "핸들 잡는 분", "드라이버"];
  let c14 = 0;
  result = result.replace(/운전자(?!보험)/g, () => (++c14 <= 3 ? "운전자" : synDriver[(c14-4) % synDriver.length]));

  // 17) "운전자보험" → 2회만
  let c15 = 0;
  result = result.replace(/운전자보험/g, () => (++c15 <= 2 ? "운전자보험" : "운전자 전용 상품"));

  // 18) "진단금" → 2회만
  let c16 = 0;
  result = result.replace(/진단금/g, () => (++c16 <= 2 ? "진단금" : "확정 지급금"));

  // 19) "치료비" → 2회만
  let c17 = 0;
  result = result.replace(/치료비/g, () => (++c17 <= 2 ? "치료비" : "의료 비용"));

  // 20) "태아" (독립) → 3회만
  let c18 = 0;
  result = result.replace(/태아(?!보험|상품)/g, () => (++c18 <= 3 ? "태아" : "아이"));

  // 21) "연금" (독립) → 3회만
  let c19 = 0;
  result = result.replace(/연금(?!보험|상품|저축|\s상품)/g, () => (++c19 <= 2 ? "연금" : "노후 자금"));

  return result;
}

// ============================================================
// 보험 키워드/주제 설정
// ============================================================
const KEYWORD_GROUPS = [
  { name: "실손보험", keywords: ["실손보험", "실비보험", "의료실비"] },
  { name: "암보험", keywords: ["암보험", "암보험 추천", "암진단금"] },
  { name: "자동차보험", keywords: ["자동차보험", "다이렉트 자동차보험"] },
  { name: "연금보험", keywords: ["연금보험", "연금저축", "개인연금"] },
  { name: "태아보험", keywords: ["태아보험", "어린이보험"] },
  { name: "치매보험", keywords: ["치매보험", "간병보험", "치매간병비"] },
  { name: "종신보험", keywords: ["종신보험", "사망보험", "유족보장"] },
  { name: "운전자보험", keywords: ["운전자보험", "교통사고보험"] },
  { name: "화재보험", keywords: ["화재보험", "주택화재", "아파트화재보험"] },
  { name: "여행자보험", keywords: ["여행자보험", "해외여행보험"] },
  { name: "건강보험", keywords: ["건강보험", "의료보험", "건강검진보험"] },
  { name: "치아보험", keywords: ["치아보험", "임플란트보험", "치과보험"] },
  { name: "펫보험", keywords: ["펫보험", "반려동물보험", "강아지보험"] },
  { name: "저축보험", keywords: ["저축보험", "저축성보험", "목돈마련"] },
  { name: "상해보험", keywords: ["상해보험", "상해질병보험"] },
  { name: "유병자보험", keywords: ["유병자보험", "간편심사보험", "고혈압보험"] },
  { name: "변액보험", keywords: ["변액보험", "변액유니버셜"] },
  { name: "단체보험", keywords: ["단체보험", "기업보험", "직장단체보험"] },
  { name: "CI보험", keywords: ["CI보험", "중대질병보험"] },
  { name: "간병보험", keywords: ["간병보험", "장기요양보험"] },
];

const TOPICS = {
  "실손보험": ["청구 서류 목록과 병원비 돌려받는 순서", "4세대 자기부담금 얼마나 내야하나", "갱신 시 얼마나 오르나 대비법", "입원비 통원비 청구 기한", "치과 치료도 실비 되나요", "한의원 한방치료 실비 청구 가능한 범위", "도수치료 실비 청구 조건과 한도"],
  "암보험": ["유사암 갑상선암도 보장되나 범위 총정리", "진단금 한번에 받기 vs 치료비 뭐가 유리", "가족력 있을때 가입 전략", "소액암 유사암 일반암 차이점", "재진단암 보장 꼭 필요한 이유", "항암치료 통원비 실비 청구 방법"],
  "자동차보험": ["다이렉트 가입 vs 설계사 상담 뭐가 유리한지", "빠뜨리기 쉬운 할인특약 목록", "운전자보험이랑 차이점 정리", "사고 후 얼마나 오르나", "자차 담보 꼭 넣어야하나", "블랙박스 할인 마일리지 할인 총정리"],
  "연금보험": ["연금저축이랑 세제 차이 한눈에 정리", "IRP 퇴직금 넣으면 세금 얼마나 줄어드나", "중도해지하면 손실 얼마나 되나", "30대 노후준비 지금 시작해도 되나", "국민연금만으로 노후 충분한지"],
  "태아보험": ["임신 몇주차에 가입해야 유리한지", "어린이보험이랑 뭐가 다른지 비교", "선천이상 보장범위 확인할 포인트", "출산 후 가입하면 달라지는 점", "저체중아 인큐베이터 비용 보장"],
  "치매보험": ["치매 진단 등급별 보장 차이", "부모님 치매보험 가입 적정 나이", "치매간병비 월 얼마나 드는지", "경도인지장애도 보장되나요"],
  "종신보험": ["종신보험 필요한 사람 vs 불필요한 사람", "정기보험이랑 뭐가 다른지", "사망보험금 상속세 절세 방법", "납입면제 조건 꼼꼼히 체크할 포인트"],
  "운전자보험": ["자동차보험이랑 뭐가 다른지 헷갈리는 분 필독", "벌금 형사합의금 보장 범위", "음주운전 사고 보장 안 되는 케이스", "자전거 킥보드 사고도 보장되나"],
  "화재보험": ["아파트 화재보험 의무가입 맞나요", "전세 월세 세입자도 필요한지", "누수 배상책임 보장 범위", "지진 태풍 자연재해 보장 여부"],
  "여행자보험": ["해외여행 전 꼭 체크할 보장 3가지", "여행자보험 vs 실손보험 해외 적용 차이", "항공기 지연 수하물 분실 보장", "장기 해외체류 시 보험 선택법"],
  "건강보험": ["건강검진 이상소견 나왔을 때 대처법", "2차 정밀검사 비용 보장받는 법", "3대 질병 보장 핵심 체크리스트"],
  "치아보험": ["임플란트 보장 얼마까지 되나요", "치아보험 면책기간 감액기간 정리", "크라운 브릿지 보장 범위", "치과 스케일링 보험 적용 여부"],
  "펫보험": ["반려견 수술비 보장 범위와 한도", "펫보험 가입 전 체크할 3가지", "고양이 보험 강아지 보험 차이점"],
  "저축보험": ["저축보험 vs 적금 뭐가 유리한지", "10년 유지 비과세 혜택 정리", "중도해지 환급금 얼마나 손해인지"],
  "상해보험": ["일상생활 상해 보장 범위 총정리", "골절 진단비 얼마나 나오나", "스포츠 활동 중 사고 보장 여부"],
  "유병자보험": ["고혈압 당뇨 있어도 가입 가능한 상품", "간편심사 vs 일반심사 보장 차이", "유병자 실손보험 가입 가능한지"],
  "변액보험": ["변액보험 수익률 현실 공개", "펀드 변경 타이밍과 방법", "원금 보장 안 되는 구조 이해하기"],
  "단체보험": ["직장 단체보험으로 충분한지 체크리스트", "퇴사하면 보장 어떻게 되나", "단체보험 개인보험 중복 청구 가능한지"],
  "CI보험": ["CI보험 중대질병 보장 범위 정리", "CI보험 vs 암보험 뭐가 유리", "진단 시 일시금 받는 구조 이해"],
  "간병보험": ["장기요양 등급 받으면 보장 얼마나", "간병인 비용 월평균과 보험 커버 범위", "부모님 간병보험 지금 가입해도 되나"],
};

// ★ 보험비교 전용 주제 (menu_id=5) - A vs B 비교 구조
const COMPARE_TOPICS = [
  { a: "실손보험 4세대", b: "구실손(1~3세대)", topic: "자기부담금 보장범위 월납입금 차이 비교" },
  { a: "암보험 진단금형", b: "암보험 치료비형", topic: "어떤 구조가 나한테 유리한지 비교" },
  { a: "종신보험", b: "정기보험", topic: "같은 사망보장인데 뭐가 다른지 비교" },
  { a: "다이렉트 자동차보험", b: "설계사 자동차보험", topic: "가격 보장 서비스 차이 비교" },
  { a: "연금저축", b: "연금보험", topic: "세제혜택 수령방식 해지 시 차이 비교" },
  { a: "태아보험", b: "어린이보험", topic: "가입시기 보장범위 납입기간 차이 비교" },
  { a: "실손보험", b: "암보험", topic: "둘 다 필요한지 하나만 들어도 되는지 비교" },
  { a: "CI보험", b: "암보험", topic: "중대질병 보장 구조가 어떻게 다른지 비교" },
  { a: "변액보험", b: "저축보험", topic: "수익률 원금보장 세제혜택 차이 비교" },
  { a: "운전자보험", b: "자동차보험", topic: "보장 겹치는 부분과 각각 필요한 이유 비교" },
  { a: "치매보험", b: "간병보험", topic: "보장 범위와 지급 조건 차이 비교" },
  { a: "화재보험", b: "주택종합보험", topic: "보장 범위와 가입 대상 차이 비교" },
  { a: "유병자보험(간편심사)", b: "일반보험(표준심사)", topic: "보장범위 납입금 차이 현실 비교" },
  { a: "펫보험 A사", b: "펫보험 B사", topic: "반려동물 보험 보장 한도 면책 비교" },
  { a: "치아보험", b: "실손보험 치과", topic: "임플란트 보장 뭐가 더 유리한지 비교" },
  { a: "단체보험(직장)", b: "개인보험", topic: "퇴사 시 보장 차이와 중복 청구 비교" },
  { a: "IRP", b: "연금저축펀드", topic: "퇴직금 넣을 때 세제혜택 차이 비교" },
  { a: "여행자보험", b: "해외 실손보험", topic: "해외 병원비 보장 차이 비교" },
];

// 설계사 라운지 전용 주제 (menu_id=18)
const AGENT_TOPICS = [
  "고객이 비싸다고 할 때 대처법 3가지",
  "첫 미팅 30초 오프닝 멘트 공식",
  "재계약 유도하는 3단계 화법",
  "거절당했을 때 멘탈 관리법",
  "클로징 잘하는 설계사의 공통점",
  "신입 설계사 첫 3개월 생존 전략",
  "고객 니즈 파악 질문 리스트",
  "보장분석 리포트 잘 쓰는 법",
  "소개 영업 잘 받는 설계사의 비밀",
  "고객이 생각할 시간 달라고 할 때",
  "GA vs 전속 장단점 현실 비교",
  "월 계약 10건 이상 찍는 루틴",
  "상담 후 후속 연락 타이밍과 멘트",
  "고객 유형별 상담 전략",
  "보험설계사 자격시험 합격 꿀팁",
  "MDRT 달성을 위한 현실 로드맵",
  "법인영업 처음 시작할 때 체크리스트",
  "설계사가 꼭 알아야 할 세금 상식",
  "고객 불만 처리하는 프로의 자세",
  "TM 영업 vs 대면 영업 현실 비교",
];

const BANNED_WORDS = ["확정 수익", "원금 보장", "무조건", "반드시 오른다", "손해 없는", "100% 보장", "절대 손해 안"];

// 카페 메뉴(카테고리) 매핑
const CAFE_MENUS = {
  "1": "공지사항",
  "4": "보험 정보",
  "5": "보험 비교",
  "7": "Q&A / 상담",
  "18": "설계사 라운지",
  "9": "자유게시판",
};

// 이미지 비용 최적화
const IMAGE_MODEL = "gemini-3-pro-image-preview";
const IMAGE_DAILY_LIMIT = 100;
const IMAGE_CACHE_TTL = 604800; // 7일

async function checkImageDailyLimit(env) {
  const today = new Date().toISOString().slice(0, 10);
  const key = `img_count_${today}`;
  const count = await kvGet(env, key, 0);
  return { count, remaining: Math.max(0, IMAGE_DAILY_LIMIT - count), exceeded: count >= IMAGE_DAILY_LIMIT };
}

async function incrementImageCount(env) {
  const today = new Date().toISOString().slice(0, 10);
  const key = `img_count_${today}`;
  const count = (await kvGet(env, key, 0)) + 1;
  await env.KV.put(key, JSON.stringify(count), { expirationTtl: 86400 });
  return count;
}
// ============================================================
// 이미지 풀(Pool) 사전 생성 시스템
// ============================================================
async function getImagePool(env) {
  return await kvGet(env, "image_pool", []);
}

async function saveImagePool(env, pool) {
  await kvSet(env, "image_pool", pool);
}

async function consumePoolImage(env, keyword) {
  const pool = await getImagePool(env);
  // 1순위: 같은 키워드 매칭
  let idx = pool.findIndex(p => !p.used && p.keyword === keyword);
  // 2순위: 아무거나 미사용
  if (idx === -1) idx = pool.findIndex(p => !p.used);
  if (idx === -1) return null;

  pool[idx].used = true;
  pool[idx].used_at = new Date().toISOString();
  await saveImagePool(env, pool);
  return pool[idx].image_key;
}

// GET /api/pool-generate — 이미지 1장 사전 생성하여 풀에 추가
async function apiPoolGenerate(env) {
  const cfg = await kvGet(env, "config", {});
  if (!cfg.gemini_api_key) return json({ ok: false, error: "Gemini API 키 없음" });

  const imgLimit = await checkImageDailyLimit(env);
  if (imgLimit.exceeded) return json({ ok: false, error: "이미지 일일 상한 초과", count: imgLimit.count });

  // 풀에서 가장 적은 키워드 선택 (균등 분배)
  const pool = await getImagePool(env);
  const unusedByKw = {};
  for (const kw of KEYWORD_GROUPS) unusedByKw[kw.name] = 0;
  for (const p of pool) { if (!p.used) unusedByKw[p.keyword] = (unusedByKw[p.keyword] || 0) + 1; }
  const sorted = Object.entries(unusedByKw).sort((a, b) => a[1] - b[1]);
  const keyword = sorted[0][0];

  const topics = TOPICS[keyword] || TOPICS["실손보험"];
  const topic = topics[Math.floor(Math.random() * topics.length)];
  const prompt = generateImagePrompts(keyword, topic, keyword, 1)[0];
  if (!prompt) return json({ ok: false, error: "프롬프트 생성 실패" });

  const imgUrl = `https://generativelanguage.googleapis.com/v1beta/models/${IMAGE_MODEL}:generateContent?key=${cfg.gemini_api_key}`;
  try {
    const resp = await fetch(imgUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseModalities: ["IMAGE"] }
      })
    });
    const d = await resp.json();
    if (d.error) return json({ ok: false, error: d.error.message });

    for (const c of (d.candidates || [])) {
      for (const part of (c.content?.parts || [])) {
        if (part.inlineData?.mimeType?.startsWith("image/")) {
          const imageKey = `pool_img_${Date.now()}`;
          await env.KV.put(imageKey, part.inlineData.data, { expirationTtl: 2592000 }); // 30일
          await incrementImageCount(env);

          pool.push({
            keyword,
            image_key: imageKey,
            created_at: new Date().toISOString(),
            used: false,
          });
          await saveImagePool(env, pool);

          const unused = pool.filter(p => !p.used).length;
          return json({ ok: true, keyword, image_key: imageKey, pool_total: pool.length, pool_unused: unused });
        }
      }
    }
    return json({ ok: false, error: "이미지 응답 없음" });
  } catch (e) {
    return json({ ok: false, error: e.message });
  }
}

// GET /api/pool-status — 풀 현황 조회
async function apiPoolStatus(env) {
  const pool = await getImagePool(env);
  const unused = pool.filter(p => !p.used);
  const used = pool.filter(p => p.used);

  // 키워드별 미사용 수
  const byKeyword = {};
  for (const p of unused) byKeyword[p.keyword] = (byKeyword[p.keyword] || 0) + 1;

  return json({
    ok: true,
    total: pool.length,
    unused: unused.length,
    used: used.length,
    by_keyword: byKeyword,
    oldest_unused: unused.length > 0 ? unused[0].created_at : null,
    newest: pool.length > 0 ? pool[pool.length - 1].created_at : null,
  });
}

// GET /api/pool-clean — 사용완료+7일 경과 항목 정리
async function apiPoolClean(env) {
  const pool = await getImagePool(env);
  const cutoff = Date.now() - 7 * 86400000;
  const cleaned = pool.filter(p => {
    if (p.used && new Date(p.used_at || p.created_at).getTime() < cutoff) return false;
    return true;
  });
  const removed = pool.length - cleaned.length;
  await saveImagePool(env, cleaned);
  return json({ ok: true, removed, remaining: cleaned.length });
}

const DISCLAIMER = "\n\n* 본 콘텐츠는 일반적인 정보 제공 목적이며, 특정 상품의 가입을 권유하지 않습니다. 가입 시 반드시 약관과 상품설명서를 확인하시기 바랍니다.";
const DAYS = ["월", "화", "수", "목", "금"];

// 프로필 블록 (글 상단) - 스팸필터 안전 용어 사용
const PROFILE_HTML = `
<div style="margin-bottom:20px;padding:18px;background:#f8fafc;border:1px solid #d0e3ff;border-radius:10px;line-height:1.9;">
<p><b style="font-size:16px;color:#1e40af;">김미경 지사장</b> <span style="color:#475569;font-size:13px;">프라임에셋(주)</span></p>
<p style="font-size:13px;color:#334155;margin-top:8px;">현직 23년차 | CY22, CY23 실적우수 개인부문 전국 11위 달성<br>
보험 보상 / 재무 / 상속 / 증여 분석 전문가<br>
기업 절세 전문가<br>
19개 생명보험사 고객 맞춤형 보장분석 설계<br>
12개 손해보험사 고객 맞춤형 보장분석 설계</p>
</div>`;

// CTA 블록 (글 하단)
const CTA_HTML = `
<hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0;">
<div style="padding:20px;background:#f0f7ff;border:1px solid #d0e3ff;border-radius:10px;text-align:center;">
<p><b style="font-size:16px;color:#1e40af;">더 궁금한 질문이 있으신가요?</b></p>
<p style="font-size:14px;color:#475569;margin-top:8px;">23년차 현직 김미경 지사장이 직접 답변드립니다.</p>
<p style="margin-top:14px;">
<a href="https://aurakim.com" style="display:inline-block;padding:11px 28px;background:#2563eb;color:#fff;border-radius:8px;text-decoration:none;font-weight:bold;font-size:14px;">홈페이지 바로가기</a>
<a href="https://talk.naver.com/profile/wf71d5c" style="display:inline-block;padding:11px 28px;background:#03c75a;color:#fff;border-radius:8px;text-decoration:none;font-weight:bold;font-size:14px;margin-left:10px;">네이버 톡톡 상담</a>
</p>
</div>`;


// ============================================================
// ============================================================
// 텔레그램 봇 알림
// ============================================================
async function sendTelegram(env, message) {
  const cfg = await kvGet(env, "config", {});
  if (!cfg.telegram_bot_token || !cfg.telegram_chat_id) return false;
  try {
    const url = `https://api.telegram.org/bot${cfg.telegram_bot_token}/sendMessage`;
    const resp = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: cfg.telegram_chat_id,
        text: message,
        parse_mode: "HTML",
        disable_web_page_preview: true,
      })
    });
    const result = await resp.json();
    return result.ok || false;
  } catch (e) {
    return false;
  }
}

async function apiTelegramTest(env) {
  const cfg = await kvGet(env, "config", {});
  if (!cfg.telegram_bot_token || !cfg.telegram_chat_id) {
    return json({ ok: false, error: "telegram_bot_token 또는 telegram_chat_id 미설정. 설정에서 입력하세요." });
  }
  const ok = await sendTelegram(env, `<b>cafe-auto-v2 텔레그램 연결 테스트</b>\n\n시간: ${new Date().toISOString()}\n상태: 정상 연결`);
  return json({ ok, message: ok ? "텔레그램 전송 성공" : "전송 실패 (토큰/챗ID 확인)" });
}

// 메인 라우터
// ============================================================
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (url.pathname === "/healthz") {
      return json({ status: "ok", version: "v2.1" });
    }

    // CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
        }
      });
    }

    if (url.pathname.startsWith("/api/")) {
      return handleApi(url, request, env, ctx);
    }

    return env.ASSETS.fetch(request);
  }
};

async function handleApi(url, request, env, ctx) {
  const path = url.pathname;
  const method = request.method;

  try {
    if (path === "/api/status") return apiStatus(env);
    if (path === "/api/config" && method === "GET") return apiConfigGet(env);
    if (path === "/api/config" && method === "POST") return apiConfigSave(request, env);
    if (path === "/api/trend") return apiTrend(env);
    if (path === "/api/plan") return apiPlan(env);
    if (path === "/api/generate" && method === "POST") return apiGenerate(request, env);
    if (path === "/api/generate-image" && method === "POST") return apiGenerateImage(request, env);
    if (path.startsWith("/api/image/")) return apiServeImage(path, env);
    if (path === "/api/publish" && method === "POST") return apiPublish(request, env);
    if (path === "/api/compliance" && method === "POST") return apiCompliance(request);
    if (path === "/api/categories") return json({ ok: true, categories: CAFE_MENUS });
    if (path === "/api/image-stats") return apiImageStats(env);
    if (path === "/api/pool-generate") return apiPoolGenerate(env);
    if (path === "/api/pool-status") return apiPoolStatus(env);
    if (path === "/api/pool-clean") return apiPoolClean(env);
    if (path === "/api/history") return apiHistory(env);
    if (path === "/api/auto-publish") return apiAutoPublish(request, env, ctx);
    if (path === "/api/auto-publish-last") return json(await kvGet(env, "auto_publish_last", { message: "아직 실행 기록 없음" }));
    if (path === "/api/auto-publish-sync") return apiAutoPublishSync(request, env);
    if (path === "/api/oauth") return apiOAuthStart(env);
    if (path === "/api/oauth-callback") return apiOAuthCallback(request, env);
    if (path === "/api/exchange-code") return apiExchangeCode(request, env);
    if (path === "/api/refresh-token") return apiRefreshToken(env);
    if (path === "/api/telegram-test") return apiTelegramTest(env);
    if (path === "/api/publish-test" && method === "POST") return apiPublishTest(request, env);
    return json({ error: "Not found" }, 404);
  } catch (e) {
    return json({ ok: false, error: e.message }, 500);
  }
}

// ============================================================
// KV 헬퍼
// ============================================================
async function kvGet(env, key, fallback = null) {
  const val = await env.KV.get(key);
  if (val === null) return fallback;
  try { return JSON.parse(val); } catch { return val; }
}

async function kvSet(env, key, value) {
  await env.KV.put(key, JSON.stringify(value));
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
  });
}

// ============================================================
// API: 상태
// ============================================================
async function apiStatus(env) {
  const cfg = await kvGet(env, "config", {});
  const history = await kvGet(env, "post_history", []);
  const today = new Date().toISOString().slice(0, 10);
  const todayCount = history.filter(h => h.timestamp && h.timestamp.startsWith(today)).length;
  const limit = cfg.daily_post_limit || 5;

  const aiEngine = cfg.zai_api_key ? "GLM-5" : (cfg.openai_api_key ? "GPT-4o" : "없음");

  return json({
    version: "v2.1",
    ai_engine: aiEngine,
    api_keys: {
      "네이버카페": !!(cfg.naver_client_id && cfg.naver_client_secret),
      "데이터랩": !!(cfg.datalab_client_id && cfg.datalab_client_secret),
      "Z.ai(GLM)": !!cfg.zai_api_key,
      "OpenAI": !!cfg.openai_api_key,
      "Gemini": !!cfg.gemini_api_key,
    },
    cafe_auth: !!cfg.naver_access_token,
    can_post: todayCount < limit,
    post_reason: todayCount >= limit ? `일일 한도 (${limit}건) 초과` : "발행 가능",
    today_count: todayCount,
    daily_limit: limit,
    last_post: history.length ? history[history.length - 1].timestamp : null,
  });
}

// ============================================================
// API: 설정 조회/저장
// ============================================================
async function apiConfigGet(env) {
  const cfg = await kvGet(env, "config", {});
  const mask = (v) => {
    if (!v) return "";
    if (v.length <= 8) return v.slice(0, 2) + "****";
    return v.slice(0, 4) + "****" + v.slice(-4);
  };
  return json({
    naver_client_id: mask(cfg.naver_client_id),
    naver_client_secret: mask(cfg.naver_client_secret),
    naver_cafe_id: cfg.naver_cafe_id || "",
    naver_menu_id: cfg.naver_menu_id || "",
    datalab_client_id: mask(cfg.datalab_client_id),
    datalab_client_secret: mask(cfg.datalab_client_secret),
    zai_api_key: mask(cfg.zai_api_key),
    openai_api_key: mask(cfg.openai_api_key),
    gemini_api_key: mask(cfg.gemini_api_key),
    post_interval_minutes: cfg.post_interval_minutes || 60,
    daily_post_limit: cfg.daily_post_limit || 5,
  });
}

async function apiConfigSave(request, env) {
  const data = await request.json();
  const cfg = await kvGet(env, "config", {});

  const fields = [
    "naver_client_id", "naver_client_secret", "naver_cafe_id", "naver_menu_id",
    "datalab_client_id", "datalab_client_secret",
    "zai_api_key", "openai_api_key", "gemini_api_key",
    "naver_access_token",
    "telegram_bot_token", "telegram_chat_id",
    "post_interval_minutes", "daily_post_limit"
  ];

  for (const f of fields) {
    const val = data[f];
    if (val && !String(val).includes("****")) {
      cfg[f] = (f === "post_interval_minutes" || f === "daily_post_limit") ? Number(val) : val;
    }
  }

  await kvSet(env, "config", cfg);
  return json({ ok: true, message: "설정 저장 완료" });
}

// ============================================================
// API: 트렌드 (네이버 데이터랩)
// ============================================================
async function apiTrend(env) {
  const cfg = await kvGet(env, "config", {});
  if (!cfg.datalab_client_id || !cfg.datalab_client_secret) {
    return json({
      ok: true,
      trends: KEYWORD_GROUPS.map((g, i) => ({
        keyword: g.name, recent: 100 - i * 15, change: [5.2, -2.1, 3.8, -1.5, 7.3][i]
      }))
    });
  }

  const endDate = new Date().toISOString().slice(0, 10);
  const startDate = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);

  const body = {
    startDate, endDate, timeUnit: "week",
    keywordGroups: KEYWORD_GROUPS.map(g => ({
      groupName: g.name, keywords: g.keywords
    }))
  };

  try {
    const resp = await fetch("https://openapi.naver.com/v1/datalab/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Naver-Client-Id": cfg.datalab_client_id,
        "X-Naver-Client-Secret": cfg.datalab_client_secret,
      },
      body: JSON.stringify(body),
    });
    const result = await resp.json();
    if (!result.results) throw new Error("DataLab 응답 오류");

    const trends = result.results.map(r => {
      const data = r.data || [];
      const recent = data.length ? data[data.length - 1].ratio : 0;
      const prev = data.length > 1 ? data[data.length - 2].ratio : recent;
      const change = prev > 0 ? ((recent - prev) / prev * 100) : 0;
      return { keyword: r.title, recent: Math.round(recent * 10) / 10, change: Math.round(change * 10) / 10 };
    });
    trends.sort((a, b) => b.change - a.change);
    return json({ ok: true, trends });
  } catch (e) {
    return json({ ok: false, error: e.message, trends: [] });
  }
}

// ============================================================
// API: 주간 플랜
// ============================================================
async function apiPlan(env) {
  const plan = [];
  const kwNames = KEYWORD_GROUPS.map(g => g.name);
  for (let i = 0; i < 5; i++) {
    const kw = kwNames[i % kwNames.length];
    const topics = TOPICS[kw] || [];
    const topic = topics[Math.floor(Math.random() * topics.length)] || "보험 가이드";
    plan.push({ day: DAYS[i], keyword: kw, topic });
  }
  return json({ ok: true, plan });
}

// ============================================================
// API: 콘텐츠 생성 (로테이션: GLM-5 / Gemini-2.5-Flash / Gemini-2.5-Flash-Lite)
// ============================================================
async function apiGenerate(request, env) {
  const data = await request.json();
  const cfg = await kvGet(env, "config", {});

  if (!cfg.zai_api_key && !cfg.openai_api_key) {
    return json({ ok: false, error: "Z.ai 또는 OpenAI API 키 미설정" });
  }

  // 키워드 미지정 시 전체에서 랜덤 선택
  let keyword = data.keyword || KEYWORD_GROUPS[Math.floor(Math.random() * KEYWORD_GROUPS.length)].name;
  let topic = data.topic || "";
  const menuId = data.menu_id || "4";
  if (!topic) {
    if (menuId === "18") {
      // 설계사 라운지: 전용 주제 풀에서 랜덤
      topic = AGENT_TOPICS[Math.floor(Math.random() * AGENT_TOPICS.length)];
      keyword = "보험설계사";
    } else if (menuId === "5") {
      // 보험비교: A vs B 비교 주제 랜덤
      const comp = COMPARE_TOPICS[Math.floor(Math.random() * COMPARE_TOPICS.length)];
      keyword = comp.a;
      topic = `${comp.a} vs ${comp.b}, ${comp.topic}`;
    } else {
      const topics = TOPICS[keyword] || TOPICS["실손보험"];
      topic = topics[Math.floor(Math.random() * topics.length)];
    }
  }

  const systemPrompt = `당신은 23년차 현직 보험 설계사 김미경입니다. 프라임에셋(주) 지사장이며, 2022년/2023년(CY22, CY23) 실적우수 개인부문 전국 11위를 달성한 전문가입니다.
19개 생명보험사, 12개 손해보험사 고객 맞춤형 보장분석 설계 전문가입니다.
폐쇄형 네이버 카페 회원을 대상으로 글을 씁니다. 누구든 이 카페에 들어왔을 때 "와, 글 진짜 잘 쓴다" 소리가 나와야 합니다.

[대표 키워드 - 반드시 포함]
- "김미경 지사장" 또는 "김미경지사장" → 본문에 1~2회 자연스럽게 삽입
- "프라임에셋" → 본문에 1회 자연스럽게 삽입
- 예: "프라임에셋(주) 김미경 지사장입니다" / "23년차 김미경 지사장이 알려드리는"
- 절대 억지로 넣지 말고, 자기소개나 경험담에서 자연스럽게

[CY22/CY23 전국 11위 관련 주의]
- "전국 11위"는 2022년, 2023년 실적 기준임
- "올해 11위", "현재 11위" 식으로 쓰지 말 것
- 정확한 표현: "CY22, CY23 개인부문 전국 11위 달성"

[글 서두 - 매번 다르게! 반복 금지!]
아래 6가지 오프닝 중 하나를 랜덤으로 선택하세요. 이전에 쓴 패턴과 다른 걸 쓸 것!

A) 에피소드형: "어제 상담 온 40대 부부가 이런 질문을 했어요."
B) 충격 사실형: "10명 중 7명이 이걸 모르고 계약합니다."
C) 직접 질문형: "혹시 지금 ~하고 계신가요?"
D) 경험 고백형: "23년차인 저도 처음엔 이걸 몰랐어요."
E) 뉴스/트렌드형: "요즘 상담하다 보면 이 질문이 부쩍 늘었어요."
F) 반전형: "~라고 생각하시죠? 사실 반대입니다."

[절대 금지 패턴]
- "이 글에서 OOO을 알려드릴게요" ← 이거 절대 쓰지 마! 너무 반복됨!
- "혹시" 2회 이상 쓰지 마!
- "솔직히" 2회 이상 쓰지 마!
- "진짜" 3회 이상 쓰지 마!
- 같은 문장 구조 3번 연속 금지!
- 매 문단 시작이 같은 어미 금지!

[글 전개 - 다양하게]
- 상담 에피소드, 비유, 반전, 데이터, 고객 대화 등 섞어서 쓸 것
- 단조로운 "~해요. ~거든요. ~잖아요." 반복 금지
- 중간에 "실제 상담 사례" 구체적으로 1개 이상 넣기
- 독자가 "이 글은 다른 글이랑 다르다" 느끼게!

[모바일 가독성 - 최우선 원칙 - 반드시 지켜!]
- 한 문단은 1~2문장만! (절대 3문장 이상 붙이지 말 것!)
- 한 문장 쓰고 마침표 찍으면 반드시 줄바꿈!
- 2문장 쓰면 반드시 빈 줄 삽입!
- 아래처럼 쓰세요:

혹시 병원비 영수증 보고 놀라신 적 있으세요?
진료비가 생각보다 많이 나와서 당황하셨죠.

걱정 마세요.
서류만 잘 챙기면 상당 부분 돌려받을 수 있어요.

- 위처럼 1~2문장마다 빈 줄!
- 절대 4문장 이상 한 덩어리로 쓰지 말 것!
- 한 문장은 40자 이내로 짧게!

[소제목 규칙 - 중요]
- ## 마크다운 절대 사용 금지!
- 소제목은 한 줄에 단독으로 쓰되, 앞에 기호 없이 쓰기
- 소제목 형식: [소제목] 또는 그냥 한줄 텍스트
- 예시:
  [왜 지금 확인해야 할까요]
  [현장에서 가장 많이 하는 실수]
  [이렇게 준비하면 됩니다]
- 소제목은 본문에 3~4개 배치

[글 포맷팅]
- 핵심 문장은 {{강조}}로 감싸기 (빨간 볼드 처리됨)
  * 반드시 한 줄 짧은 문장만! 긴 문장 금지!
  예: {{지금 확인 안 하면 후회합니다}}
  예: {{이것만 알면 절반은 성공입니다}}
- ** 마크다운 볼드 절대 금지
- * 이탤릭, - 목록 등 마크다운 전체 금지
- 한줄요약: 핵심 정보 1문장 압축 (인용구로 표시됨)

[문체/톤 - 재미있고 재치있게!]
- 딱딱한 정보 나열 금지! 이야기하듯 써야 함
- 해요체 기본 ("~거예요", "~하세요"), 습니다체 살짝 섞기
- 구어체 적극 활용: "진짜", "솔직히", "~거든요", "~잖아요"
- 감탄사/추임새 자연스럽게: "아", "에이", "근데요", "사실은요"
- 비유/예시 풍부하게: "마치 ~ 같은 거예요", "쉽게 말하면"
- 독자에게 말 걸기: "여러분", "혹시", "한번 생각해보세요"
- 위트/유머: 가끔 웃음 포인트 (과하지 않게)
- 고객 관점: "나에게 어떤 이득?" "그래서 뭐가 좋은데?"
- 23년 현장 경험담 (구체적 상담 사례/에피소드)
- 같은 문체 3문장 연속 금지

[Q&A 형식]
- 반드시 Q: / A: 형식만 사용
- Q&A 반드시 5개 (체류시간 핵심)
- 실제 고객이 자주 물어보는 질문 중심
- 답변은 간결하고 핵심만

[댓글 유도]
- 마지막에 독자 참여 질문 1개
- 재치있게: "여러분은 이런 경험 있으신가요?", "댓글로 알려주세요!"

[SEO/AEO/GEO/C-RANK/DIA 최적화 - 네이버 1위 목표]

[제목 최적화 - 가장 중요!]
- 롱테일 키워드 사용 (경쟁 낮고 검색의도 명확)
  * 나쁜 예: "실손보험 알아보기" (경쟁 과다)
  * 좋은 예: "실손보험 청구 서류 목록, 병원비 돌려받는 순서" (구체적)
  * 좋은 예: "암보험 유사암 보장범위, 갑상선암도 되나요?" (질문형)
- 제목에 키워드 1~2회만 (과다 삽입하면 역효과)
- 질문형 또는 숫자 포함 (클릭률 상승)
- 제목 30자 내외 (모바일에서 잘리지 않게)

[첫 문단 = 승부처 (AI 요약 + DIA 핵심)]
- 첫 100자 안에 이 글의 핵심 요점을 압축
- 네이버 AI가 첫 문단을 스니펫으로 추출함 → 핵심 정보를 자연스럽게 담기
- 네이버 AI가 첫 문단을 스니펫으로 추출함
- 검색자가 "내가 찾던 글이다!" 느끼게

[DIA 적합도 (제목-본문 일치)]
- 제목에서 약속한 내용이 본문에 100% 있어야 함
- 제목: "청구 서류 3가지" → 본문에 반드시 서류 3가지 나열
- 제목과 본문 불일치 = DIA 점수 최하 → 노출 불가
- 검색자 질문에 직접 답변하는 구조 (질문→답→근거)

[C-RANK 전문성 신호]
- 보험 주제 일관성 유지 (잡다한 주제 금지)
- 구체적 상담 사례/에피소드 포함 (체험 기반)
- 출처 명시 (금융감독원, 보험업법 등)
- 23년 현장 경험 언급 (전문가 신뢰도)
- 김미경 지사장 / 프라임에셋 자연 삽입

[체류시간 극대화]
- 문단 2~3줄 짧게 (스크롤 유도)
- Q&A 3~5개로 "다음 질문이 뭐지?" 호기심
- 핵심 포인트 {{강조}} (시선 고정)
- [소제목]으로 섹션 구분 (쉽게 훑어보기)
- 마지막 댓글 유도 질문 (반응 유발 → DIA 가산점)

[AEO - AI 검색엔진 인용]
- [한줄요약]이 네이버 AI/구글 SGE에서 그대로 인용되도록
- 팩트 기반, 객관적, 완결된 1문장
- 예: "실손보험 4세대는 자기부담금이 있지만 통원 제한 없이 실제 치료비를 보장한다"

[GEO - 지역 검색]
- "전국 상담 가능" 자연 삽입 1회

[스팸필터 회피]
- "보험" 전체 5회 이하
- 동의어 돌려쓰기: 실손→의료실비, 갱신→재계약, 가입→계약, 보장→혜택
- 같은 용어 2회 연속 금지
- 구체적 금액(만 원) 절대 금지! 퍼센트(%) 절대 금지!
- "적지 않은 금액", "상당한 차이" 등 추상적 표현 사용

[글 길이]
- 1500~2500자 사이 (랜덤 길이, 자연스럽게)
- 프로필/CTA는 시스템이 자동 추가하므로 본문에 넣지 말 것
- "관련 키워드" 섹션 넣지 말 것
- "무료 상담" 문구 넣지 말 것
- 소제목, Q&A 포함하여 충실하게 작성
- 핵심 정보를 빠뜨리지 않되 자연스럽게 채울 것
- 억지로 반복하거나 같은 말 돌려쓰기 금지

[절대 금지]
- 이모지, 특수기호 (▶■★●【】 등)
- 해시태그(#) 본문 내 사용
- ** (볼드), * (이탤릭), - (목록) 등 마크다운 문법
- "확정 수익", "원금 보장", "무조건" 등 금소법 위반 표현
- 보험 전문 용어 4개 이상 동시 사용
- "관련 키워드:" 섹션을 본문에 넣지 말 것 (시스템이 자동 추가함)
- "무료 상담" 문구 본문에 넣지 말 것 (시스템이 CTA 블록으로 자동 추가함)`;

  // 카테고리별 톤/스타일
  const CATEGORY_STYLE = {
    "4": { name: "보험 정보", style: "전문 정보성 글 + 업계 뉴스 해설 통합. 23년 현장 경험을 살려 정확하고 실용적인 정보 전달. 제도 변경, 정책 뉴스도 설계사/고객 관점에서 해설. 독자가 '이건 진짜 도움 된다' 느끼게." },
    "5": { name: "보험 비교", style: "★ 반드시 A vs B 비교 구조로 작성! 주제에 나온 두 상품/방식을 항목별로 비교해야 함. 구조: 1) 두 상품 간단 소개 2) [보장범위 비교] 항목 3) [납입금/비용 비교] 항목 4) [장단점 정리] A의 장점/단점, B의 장점/단점 5) [결론: 이런 분은 A, 저런 분은 B] 고객 상황별 추천. 절대 한쪽만 설명하지 말 것! 반드시 양쪽 다 공평하게 다루고 비교해야 함." },
    "7": { name: "Q&A / 상담", style: "실제 고객 상담 사례 기반. '이런 질문 정말 많이 받아요'로 시작. 질문 5개 이상. 답변은 짧고 명쾌하게." },
    "18": { name: "설계사 라운지", style: "보험설계사/GA 영업인을 위한 실전 콘텐츠. 영업 노하우, 상담 스크립트, 고객 거절 대처법, 클로징 멘트, 리크루팅 팁, 실적 관리법, 신입 설계사 가이드. 23년차 전국 11위(CY22/CY23) 경험에서 나오는 현장 노하우. 선배가 후배에게 알려주는 톤. '이거 하나만 바꿔도 계약 2배'식 실용 정보." },
    "9": { name: "자유게시판", style: "가벼운 일상 톤. 보험과 삶을 연결. '어제 상담 받으신 분이...' 에피소드형. 편하게 읽히게." },
  };
  const catInfo = CATEGORY_STYLE[menuId] || CATEGORY_STYLE["4"];

  // ★ 오프닝 패턴 로테이션 (같은 패턴 3회 연속 금지)
  const OPENING_TYPES = ["A", "B", "C", "D", "E", "F"];
  const OPENING_LABELS = {
    A: "에피소드형 (실제 상담 사례로 시작)",
    B: "충격 사실형 (놀라운 통계/사실로 시작)",
    C: "직접 질문형 (독자에게 질문 던지며 시작)",
    D: "경험 고백형 (23년차 본인 경험담으로 시작)",
    E: "뉴스/트렌드형 (최근 변화/트렌드로 시작)",
    F: "반전형 (상식 뒤집는 사실로 시작)",
  };
  const recentOpenings = await kvGet(env, "recent_openings", []);
  // 최근 2회 사용된 패턴 제외
  const recentTwo = recentOpenings.slice(-2);
  const available = OPENING_TYPES.filter(t => !recentTwo.includes(t));
  const selectedOpening = available[Math.floor(Math.random() * available.length)] || "C";
  // 저장 (최근 6개까지)
  recentOpenings.push(selectedOpening);
  if (recentOpenings.length > 6) recentOpenings.shift();
  await kvSet(env, "recent_openings", recentOpenings);

  // ★ 소제목 키워드 4개 사전 생성 (AI가 빼먹지 않도록)
  const subtitleHints = [
    `[핵심 포인트 정리]`,
    `[현장에서 자주 보는 실수]`,
    `[이렇게 준비하면 됩니다]`,
    `[꼭 확인해야 할 체크리스트]`,
    `[모르면 손해 보는 핵심]`,
    `[전문가가 알려주는 팁]`,
    `[실제 상담 사례]`,
    `[비교해보면 답이 나옵니다]`,
  ];
  // 4개 랜덤 선택 (중복 제거)
  const shuffled = subtitleHints.sort(() => Math.random() - 0.5);
  const pickedSubtitles = shuffled.slice(0, 4);

  // 글 길이 랜덤 (1800~2500자 범위 - 상향)
  const minLen = 1800 + Math.floor(Math.random() * 400); // 1800~2200
  const maxLen = minLen + 300; // 2100~2500

  const userPrompt = `키워드: ${keyword}
주제: ${topic}
카테고리: ${catInfo.name}
카테고리 스타일: ${catInfo.style}

위 주제로 네이버 카페 게시글을 작성해주세요.
읽는 사람이 "와, 이 사람 글 진짜 잘 쓴다" 하게 재미있고 재치있게 써주세요.

[오프닝 패턴 강제 지정 - 반드시 이 방식으로 시작!]
이번 글은 "${selectedOpening}. ${OPENING_LABELS[selectedOpening]}" 방식으로 시작하세요.
다른 오프닝 방식 절대 쓰지 말고, 위 패턴만 사용하세요!

형식 (반드시 준수):
[제목] (롱테일 키워드 + 질문형 or 숫자, 30자 내외, 연도 절대 금지)
  예: "실손보험 청구 서류 목록, 병원비 돌려받는 순서"
  예: "암보험 유사암 갑상선암도 보장되나요? 범위 총정리"
[한줄요약] (팩트 기반 1문장, AI 검색엔진 인용용)
[해시태그] (쉼표 구분, 5~8개, 김미경지사장/프라임에셋 포함하지 않아도 됨 - 시스템이 자동 추가)
[본문]
- ${minLen}~${maxLen}자 사이 (랜덤 길이), 연도(2025/2026 등) 절대 넣지 말 것
- 첫 문단(100자 이내)에 핵심 정보 자연스럽게 (단, "이 글에서 OOO 알려드릴게요" 패턴 절대 금지!)
- 제목에서 약속한 내용이 본문에 반드시 있어야 함 (DIA 적합도)
- 본문 안에 "프라임에셋(주) 김미경 지사장" 자연스럽게 1회 포함 (자기소개/경험담 맥락)

[소제목 4개 필수! - 이것보다 적으면 안 됨!]
- ## 절대 금지! 소제목은 [대괄호] 형식
- 아래 4개 소제목을 참고하되, 주제에 맞게 자연스럽게 변형해서 사용:
  ${pickedSubtitles.join("\n  ")}
- 소제목 4개 미만이면 실패! 반드시 4개 이상!

[Q&A 5개 필수! - 3개로는 부족!]
- Q: / A: 형식 Q&A 반드시 5개
- 독자가 "아 이것도 궁금했는데!" 하는 질문 위주
- 답변은 2~3문장으로 간결하고 명쾌하게

- 문단 1~2줄 짧게 (모바일 최적화, 3줄 이상 절대 금지)
- 핵심 문장: {{짧은 한줄}} 감싸기 (긴 문장 금지! 10~20자 이내)
- --- 구분선 절대 사용 금지!
- "전국 11위"는 CY22/CY23(2022년/2023년) 실적이라고 정확히 표기

[댓글 유도 - 강하게!]
- 마지막에 도발적이고 재치있는 질문 1개 (독자가 댓글 안 달고 못 배기게!)
- 예: "여러분은 ~할 때 어떻게 하세요? 댓글로 공유해주시면 제가 직접 답변드릴게요!"
- 예: "혹시 이런 경험 있으신 분? 저만 그런 건 아니겠죠?"

- ** 마크다운 절대 금지, 관련 키워드 섹션 금지, 무료 상담/프로필 문구 금지`;

  let aiResult = null;
  let aiEngine = "unknown";

  // AI 엔진 우선순위 고정: GLM-5 → Gemini-2.5-Flash → GPT-4o-mini
  const engineCounterDebug = { mode: "fixed-priority", order: "GLM → Gemini → GPT" };

  // 엔진 호출 함수들
  async function callGLM() {
    if (!cfg.zai_api_key) return null;
    const glmPrompt = userPrompt + `\n\n[중요] ${minLen}~${maxLen}자 범위로 작성. 소제목, Q&A 포함. 소제목 4개 필수, Q&A 5개 필수.`;
    const resp = await fetch("https://api.z.ai/api/coding/paas/v4/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${cfg.zai_api_key}`
      },
      body: JSON.stringify({
        model: "glm-5",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: glmPrompt }
        ],
        temperature: 0.75,
        max_tokens: 4000,
        thinking: { type: "disabled" }
      })
    });
    const d = await resp.json();
    return d.choices?.[0]?.message?.content || null;
  }

  async function callGemini() {
    if (!cfg.gemini_api_key) return null;
    const geminiPrompt = userPrompt + `\n\n[중요] ${minLen}~${maxLen}자 범위로 작성. 소제목, Q&A 포함. 소제목 4개 필수, Q&A 5개 필수.`;
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${cfg.gemini_api_key}`;
    const resp = await fetch(geminiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents: [{ role: "user", parts: [{ text: geminiPrompt }] }],
        generationConfig: { temperature: 0.75, maxOutputTokens: 4000 }
      })
    });
    const d = await resp.json();
    const parts = d.candidates?.[0]?.content?.parts || [];
    return parts.filter(p => p.text && !p.thought).map(p => p.text).join("") || null;
  }

  async function callGPTmini() {
    if (!cfg.openai_api_key) return null;
    const gptPrompt = userPrompt + `\n\n[중요] ${minLen}~${maxLen}자 범위로 작성. 소제목, Q&A 포함. 소제목 4개 필수, Q&A 5개 필수.`;
    const resp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${cfg.openai_api_key}`
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: gptPrompt }
        ],
        temperature: 0.75,
        max_tokens: 4000
      })
    });
    const d = await resp.json();
    return d.choices?.[0]?.message?.content || null;
  }

  const engines = [
    { name: "GLM-5", fn: callGLM },
    { name: "Gemini-2.5-Flash", fn: callGemini },
    { name: "GPT-4o-mini", fn: callGPTmini }
  ];

  // 엔진 우선순위: GLM-5 → Gemini-2.5-Flash → GPT-4o-mini (항상 고정)
  const engineDebug = [];
  for (let i = 0; i < 3; i++) {
    try {
      const result = await engines[i].fn();
      const len = result ? result.length : 0;
      engineDebug.push({ engine: engines[i].name, status: result ? "ok" : "empty", length: len });
      if (result && result.length > 500) {
        aiResult = result;
        aiEngine = engines[i].name;
        break;
      }
    } catch (e) {
      engineDebug.push({ engine: engines[i].name, status: "error", error: e.message });
      console.error(`${engines[i].name} error:`, e.message);
    }
  }

  if (!aiResult) {
    return json({ ok: false, error: "AI 엔진 응답 없음" });
  }

  // 파싱 (다양한 AI 출력 형식 대응)
  let title = "", summary = "", hashtags = "", body = aiResult;

  // [제목] 또는 제목: 패턴
  const titleMatch = aiResult.match(/\[제목\]\s*(.+)/) || aiResult.match(/^제목[:：]\s*(.+)/m);
  // [한줄요약] 또는 한줄요약: 또는 **한줄요약:** 패턴
  const summaryMatch = aiResult.match(/\[한줄요약\]\s*(.+)/) || aiResult.match(/\*?\*?한줄요약\*?\*?[:：]\s*(.+)/);
  // [해시태그] 또는 해시태그: 패턴
  const hashtagMatch = aiResult.match(/\[해시태그\]\s*(.+)/) || aiResult.match(/\*?\*?해시태그\*?\*?[:：]\s*(.+)/);
  if (titleMatch) title = titleMatch[1].trim().replace(/^\*+|\*+$/g, "");
  if (summaryMatch) summary = summaryMatch[1].trim().replace(/^\*+|\*+$/g, "");
  if (hashtagMatch) hashtags = hashtagMatch[1].trim().replace(/^\*+|\*+$/g, "");

  const bodyStart = aiResult.indexOf("[본문]");
  if (bodyStart > -1) {
    body = aiResult.slice(bodyStart + 4).trim();
  } else {
    // 모든 마커 줄 제거
    body = aiResult
      .replace(/\[제목\]\s*.+/g, "")
      .replace(/\[한줄요약\]\s*.+/g, "")
      .replace(/\[해시태그\]\s*.+/g, "")
      .replace(/^제목[:：]\s*.+/gm, "")
      .replace(/\*?\*?한줄요약\*?\*?[:：]\s*.+/g, "")
      .replace(/\*?\*?해시태그\*?\*?[:：]\s*.+/g, "")
      .trim();
  }

  // 제목 없으면 첫 줄에서 추출
  if (!title && body) {
    const firstLine = body.split("\n").find(l => l.trim() && !l.trim().startsWith("##") && !l.trim().startsWith("---"));
    if (firstLine && firstLine.trim().length < 80) {
      title = firstLine.trim();
      body = body.replace(firstLine, "").trim();
    } else {
      title = `${keyword} ${topic}`;
    }
  }

  // ** 볼드 마크다운 제거 (Gemini/GPT가 가끔 넣음)
  body = body.replace(/\*\*(.+?)\*\*/g, "$1");

  // 스팸필터 적용
  body = applySpamFilter(body);
  title = applySpamFilterLight(title);
  summary = applySpamFilter(summary);
  hashtags = applySpamFilter(hashtags);
  // ★ 대표 키워드 해시태그 고정 추가
  const fixedTags = "김미경지사장,프라임에셋";
  hashtags = hashtags ? (fixedTags + "," + hashtags) : fixedTags;
  title = title.replace(/\{\{(.+?)\}\}/g, "$1"); // 제목에서 강조 마커 제거

  // CP949 미지원 문자 제거 (GLM-5이 가끔 깨진 유니코드 출력)
  body = body.replace(/[\uFFFD\u200B\u200C\u200D\uFEFF]/g, "");
  title = title.replace(/[\uFFFD\u200B\u200C\u200D\uFEFF]/g, "");
  title = title.replace(/\*+/g, "").replace(/^[\s\-:]+|[\s\-:]+$/g, "").trim();
  // 제목에서 대괄호 제거 (소제목 형식이 제목에 들어간 경우)
  title = title.replace(/^\[(.+)\]$/, "$1").trim();
  // 중국어/일본어 문자 제거 (GLM-5 버그)
  title = title.replace(/[\u4E00-\u9FFF\u3400-\u4DBF\u3040-\u309F\u30A0-\u30FF]/g, "").replace(/\s{2,}/g, " ").trim();
  body = body.replace(/[\u4E00-\u9FFF\u3400-\u4DBF\u3040-\u309F\u30A0-\u30FF]/g, "").replace(/\s{2,}/g, " ");
  summary = summary.replace(/[\u4E00-\u9FFF\u3400-\u4DBF\u3040-\u309F\u30A0-\u30FF]/g, "").trim();
  // 연도 제거 (2024~2030만 - 과거 연도는 유지)
  title = title.replace(/,?\s*202[4-9]년?\s*(대비|준비|버전|기준|최신|을)?/g, "").replace(/\s{2,}/g, " ").trim();
  title = title.replace(/,?\s*2030년?\s*(대비|준비|버전|기준|최신|을)?/g, "").replace(/\s{2,}/g, " ").trim();
  body = body.replace(/202[4-9]년\s*(기준|대비|준비|버전|최신)?/g, "").replace(/\s{2,}/g, " ");
  summary = summary.replace(/202[4-9]년?\s*/g, "").trim();

  // 금소법 필터
  const filtered = [];
  for (const word of BANNED_WORDS) {
    if (body.includes(word)) {
      filtered.push(word);
      body = body.replaceAll(word, "");
    }
  }

  // ★ ## 소제목 → [대괄호] 소제목 강제 변환 (GLM이 ## 고집할 때)
  body = body.replace(/#{2,3}\s*(.+)/g, (match, p1) => {
    // "## 소제목 본문내용..." → 소제목과 본문 분리
    const clean = p1.trim();
    // 소제목이 너무 길면 (30자 이상) 첫 문장만 소제목으로
    if (clean.length > 30) {
      const parts = clean.split(/(?<=[.?!。])\s*/);
      if (parts.length > 1) {
        return `\n[${parts[0]}]\n${parts.slice(1).join(" ")}`;
      }
    }
    return `\n[${clean}]\n`;
  });

  // Rich HTML 본문 생성
  const htmlBody = buildRichHTML(title, summary, body, keyword);

  // 이미지: 풀(pool) 우선 → 없으면 실시간 생성
  let imageKeys = [];
  let imageSource = "none";
  
  // ★ 1단계: 풀에서 이미지 가져오기 시도
  const poolKey = await consumePoolImage(env, keyword);
  if (poolKey) {
    imageKeys = [poolKey];
    imageSource = "pool";
  }
  // ★ 2단계: 풀에 없으면 실시간 생성 (기존 로직)
  else if (cfg.gemini_api_key) {
    const imgLimit = await checkImageDailyLimit(env);
    const actualCount = imgLimit.exceeded ? 0 : 1;
    if (actualCount === 0) {
      console.log(`이미지 일일 상한 초과: ${imgLimit.count}/${IMAGE_DAILY_LIMIT}`);
    }
    const imgPrompts = generateImagePrompts(keyword, topic, title, actualCount);
    const imgModel = IMAGE_MODEL;
    const imgUrl = `https://generativelanguage.googleapis.com/v1beta/models/${imgModel}:generateContent?key=${cfg.gemini_api_key}`;

    const imgResults = await Promise.allSettled(imgPrompts.map(async (prompt, i) => {
      const resp = await fetch(imgUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseModalities: ["IMAGE"] }
        })
      });
      const d = await resp.json();
      if (d.error) throw new Error(d.error.message);
      for (const c of (d.candidates || [])) {
        for (const part of (c.content?.parts || [])) {
          if (part.inlineData?.mimeType?.startsWith("image/")) {
            const key = `image_${Date.now()}_${i}`;
            await env.KV.put(key, part.inlineData.data, { expirationTtl: 2592000 });
            await incrementImageCount(env);
            return key;
          }
        }
      }
      return null;
    }));
    imageKeys = imgResults.filter(r => r.status === "fulfilled" && r.value).map(r => r.value);
    imageSource = imageKeys.length > 0 ? "realtime" : "none";
  }

  // ★ 다음 글 예고 (재방문 유도 → 등급 상승)
  const nextKw = KEYWORD_GROUPS[Math.floor(Math.random() * KEYWORD_GROUPS.length)].name;
  const nextTopics = TOPICS[nextKw] || TOPICS["실손보험"];
  const nextTopic = nextTopics[Math.floor(Math.random() * nextTopics.length)];
  const NEXT_TEASER = `<div style="margin:24px 0 16px;padding:16px 18px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;line-height:1.7;">
<p style="font-size:13px;color:#16a34a;font-weight:bold;margin-bottom:6px;">다음 글 예고</p>
<p style="font-size:14px;color:#166534;">${escapeHtml(nextKw)} - ${escapeHtml(nextTopic)}</p>
<p style="font-size:13px;color:#4ade80;margin-top:4px;">카페 알림 설정하시면 새 글을 바로 받아보실 수 있어요!</p>
</div>`;

  return json({
    ok: true,
    title,
    summary,
    hashtags,
    body,
    html_body: htmlBody,
    full_text: PROFILE_HTML + htmlBody + NEXT_TEASER + CTA_HTML + DISCLAIMER.replace(/\n/g, "<br>"),
    keyword,
    topic,
    aiEngine,
    engineDebug,
    engineCounterDebug,
    compliance_ok: filtered.length === 0,
    filtered_words: filtered,
    length: body.length,
    image_keys: imageKeys,
    image_count: imageKeys.length,
    image_source: imageSource,
  });
}

/**
 * 본문을 Rich HTML로 변환 (네이버 카페 에디터 호환)
 */
/**
 * 키워드/주제 기반 이미지 프롬프트 생성 (한국인, 한국 배경 필수)
 */
function generateImagePrompts(keyword, topic, title, count) {
  // ★ 항상 1장만
  if (!count || count <= 0) return [];
  count = 1;

  // ★ 키워드+주제 기반 동적 이미지 프롬프트 생성
  const sceneMap = {
    "실손보험": "Korean patient at hospital reception desk reviewing medical bill. Modern Korean hospital interior.",
    "암보험": "Korean doctor explaining diagnosis result to Korean patient in hospital consultation room. Caring empathetic atmosphere.",
    "자동차보험": "Korean driver inspecting car damage after minor accident in Korean city parking lot.",
    "연금보험": "Happy retired Korean couple in 60s walking together in Korean park. Peaceful secure atmosphere.",
    "태아보험": "Pregnant Korean woman in 30s smiling at ultrasound monitor in Korean hospital. Excited expression.",
    "치매보험": "Korean adult child in 30s holding elderly Korean parent's hand at home. Warm caring moment. Korean living room.",
    "종신보험": "Korean family of four smiling together in Korean apartment living room. Warm protective family atmosphere.",
    "운전자보험": "Korean person talking to traffic police officer after car accident on Korean street. Calm daytime scene.",
    "화재보험": "Korean family looking at apartment building exterior from outside. Modern Korean apartment complex. Safety concept.",
    "여행자보험": "Korean couple in casual clothes checking travel documents at Incheon airport departure gate. Excited travelers.",
    "건강보험": "Korean person in 40s receiving health checkup results from Korean doctor at hospital. Concerned expression.",
    "치아보험": "Korean patient sitting in dental chair at modern Korean dentist clinic. Clean bright medical interior.",
    "펫보험": "Korean woman in 30s hugging golden retriever dog at Korean veterinary clinic. Loving pet owner moment.",
    "저축보험": "Korean couple in 30s reviewing financial documents together at Korean apartment kitchen table. Planning future.",
    "상해보험": "Korean person with arm cast visiting Korean hospital orthopedic department. Rehabilitation concept.",
    "유병자보험": "Korean elderly person in 60s having blood pressure checked by Korean nurse at clinic. Caring medical scene.",
    "변액보험": "Korean man in 40s looking at stock chart on phone screen at Korean cafe. Thoughtful investment decision.",
    "단체보험": "Korean office workers in business casual having team meeting at modern Korean company office.",
    "CI보험": "Korean family visiting hospital together, supportive atmosphere in Korean hospital corridor.",
    "간병보험": "Korean caregiver helping elderly Korean person walk in Korean nursing home. Warm supportive scene.",
    "보험설계사": "Korean businesswoman in 40s presenting financial plan to Korean client at modern office meeting room.",
  };

  const baseScene = sceneMap[keyword] || `Korean professional consulting with Korean client about ${keyword} at modern Korean office.`;
  
  // 제목에서 핵심 키워드 추출해서 이미지 맥락 추가
  const titleContext = title.replace(/[?!.,]/g, '').substring(0, 30);
  
  const prompt1 = `${baseScene} Natural lighting. Photo-realistic. Korean background. ABSOLUTELY NO TEXT, NO LETTERS, NO WORDS, NO KOREAN TEXT, NO ENGLISH TEXT anywhere on the image. Pure photography only.`;
  
  return [prompt1];
}

/**
 * 본문을 Rich HTML로 변환 (네이버 카페 에디터 호환)
 */
function buildRichHTML(title, summary, body, keyword) {
  let html = "";

  // ★ 전처리: 각 마커를 개별 줄로 분리
  let processed = body;
  processed = processed.replace(/\s*---\s*/g, "\n---\n");
  // ## 혹시 남아있으면 처리
  processed = processed.replace(/\s*(#{2,3}\s)/g, "\n$1");
  // [소제목] 패턴: 인라인이든 줄시작이든 모두 별도 줄로 분리
  // GLM이 "{{강조}} [소제목] 본문내용" 식으로 인라인 배치하는 문제 해결
  processed = processed.replace(/\s*(\[[^\]]{2,30}\])\s*/g, "\n$1\n");
  // Q: A: 줄바꿈
  processed = processed.replace(/\s+(Q[.:]\s)/g, "\n$1");
  processed = processed.replace(/\s+(A[.:]\s)/g, "\n$1");

  // ★ 긴 문단 자동 분리 (모바일 가독성 핵심)
  const rawLines = processed.split("\n");
  const newLines = [];
  for (const line of rawLines) {
    const trimmed = line.trim();
    // 소제목, Q&A, 구분선 등은 건드리지 않음
    if (!trimmed || trimmed.startsWith("[") || trimmed.startsWith("Q") || trimmed.startsWith("A") || trimmed === "---") {
      newLines.push(line);
      continue;
    }
    // 150자 이하면 그대로 (프롬프트가 이미 짧게 쓰도록 지시)
    if (trimmed.length <= 150) {
      newLines.push(line);
      continue;
    }
    // 150자 초과: 한국어 문장 종결 패턴에서만 줄바꿈 (3문장마다)
    let result = "";
    let sentCount = 0;
    for (let i = 0; i < trimmed.length; i++) {
      result += trimmed[i];
      // 한국어 문장 종결: ~요. ~다. ~죠. ~까? ~세요. ~니다. 등
      if (i >= 2 && (trimmed[i] === '.' || trimmed[i] === '?' || trimmed[i] === '!') && i < trimmed.length - 1) {
        const prev = trimmed[i - 1];
        const next = trimmed[i + 1];
        const isKoreanEnd = /[요다죠까세니]/.test(prev);
        if (isKoreanEnd && (next === ' ' || next === '\n')) {
          sentCount++;
          if (sentCount >= 3 && result.length > 60) {
            newLines.push(result.trim());
            newLines.push(""); // 빈 줄
            result = "";
            sentCount = 0;
          }
        }
      }
    }
    if (result.trim()) newLines.push(result.trim());
  }
  processed = newLines.join("\n");
  processed = processed.replace(/\n{3,}/g, "\n\n");

  // 한줄요약 인용구
  if (summary) {
    html += `<blockquote style="padding:14px 16px;background:#f0f7ff;border-left:4px solid #2563eb;color:#1e40af;border-radius:4px;font-size:15px;line-height:1.6;">${escapeHtml(summary)}</blockquote>\n<br>\n`;
  }

  // 본문 변환
  const lines = processed.split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) { html += "<p><br></p>\n"; continue; }

    // [소제목] 패턴
    const bracketMatch = trimmed.match(/^\[([^\]]{2,30})\]$/);
    if (bracketMatch) {
      const text = bracketMatch[1];
      let e = escapeHtml(text).replace(/\{\{(.+?)\}\}/g, '<b style="color:#dc2626">$1</b>');
      html += `<p><b style="font-size:16px;color:#1e40af;border-bottom:2px solid #d0e3ff;padding-bottom:8px;display:block;margin-top:24px;margin-bottom:8px;">${e}</b></p>\n`;
      continue;
    }

    // ## 소제목 (혹시 남은 경우)
    if (trimmed.startsWith("## ") || trimmed.startsWith("### ")) {
      const text = trimmed.replace(/^#{2,3}\s*/, "");
      let e = escapeHtml(text).replace(/\{\{(.+?)\}\}/g, '<b style="color:#dc2626">$1</b>');
      html += `<p><b style="font-size:16px;color:#1e40af;border-bottom:2px solid #d0e3ff;padding-bottom:8px;display:block;margin-top:24px;margin-bottom:8px;">${e}</b></p>\n`;
      continue;
    }

    // Q&A 질문
    if (/^Q[.:\s]/.test(trimmed)) {
      let e = escapeHtml(trimmed).replace(/\{\{(.+?)\}\}/g, '<b style="color:#dc2626">$1</b>');
      html += `<p style="margin-top:18px;margin-bottom:4px;"><b style="color:#2563eb;font-size:15px;">${e}</b></p>\n`;
      continue;
    }

    // Q&A 답변
    if (/^A[.:\s]/.test(trimmed)) {
      let e = escapeHtml(trimmed).replace(/\{\{(.+?)\}\}/g, '<b style="color:#dc2626">$1</b>');
      html += `<p style="padding-left:12px;border-left:3px solid #93c5fd;color:#334155;margin-bottom:14px;">${e}</p>\n`;
      continue;
    }

    // 구분선 --- → 빈 줄(스페이싱)로 처리 (네이버에서 --- 텍스트 그대로 노출 방지)
    if (trimmed === "---" || trimmed === "***") {
      html += "<br>\n";
      continue;
    }

    // ★ {{강조}} 단독 줄 → 핵심 포인트 박스 (체류시간 UP)
    const soloHighlight = trimmed.match(/^\{\{(.+?)\}\}$/);
    if (soloHighlight) {
      const text = soloHighlight[1];
      html += `<div style="margin:20px 0;padding:14px 18px;background:#fef3c7;border-left:4px solid #f59e0b;border-radius:6px;font-size:15px;font-weight:bold;color:#92400e;line-height:1.6;">${escapeHtml(text)}</div>\n`;
      continue;
    }

    // 일반 문단
    let e = escapeHtml(trimmed).replace(/\{\{(.+?)\}\}/g, '<b style="color:#dc2626">$1</b>');
    html += `<p style="line-height:1.8;margin-bottom:12px;">${e}</p>\n`;
  }

  return html;
}

function escapeHtml(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// ============================================================
// API: 이미지 생성 (Gemini)
// ============================================================
async function apiGenerateImage(request, env) {
  const data = await request.json();
  const cfg = await kvGet(env, "config", {});

  if (!cfg.gemini_api_key) {
    return json({ ok: false, error: "Gemini API 키 미설정" });
  }

  const keyword = data.keyword || "보험";
  const title = data.title || "보험 가이드";
  const topic = data.topic || "";
  const count = 1; // ★ 항상 1장만

  const prompts = generateImagePrompts(keyword, topic, title, count);

  const imageKeys = [];
  const imageErrors = [];
  const model = "gemini-3-pro-image-preview";
  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${cfg.gemini_api_key}`;

  for (let i = 0; i < prompts.length; i++) {
    try {
      const resp = await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompts[i] }] }],
          generationConfig: { responseModalities: ["IMAGE"] }
        }),
      });

      const result = await resp.json();
      if (result.error) {
        console.error(`Image ${i+1} error:`, result.error.message);
        imageErrors.push(`img${i+1}: ${result.error.message}`);
        continue;
      }

      const candidates = result.candidates || [];
      for (const c of candidates) {
        for (const part of (c.content?.parts || [])) {
          if (part.inlineData?.mimeType?.startsWith("image/")) {
            const imageKey = `image_${Date.now()}_${i}`;
            await env.KV.put(imageKey, part.inlineData.data, { expirationTtl: 2592000 });
            imageKeys.push(imageKey);
            break;
          }
        }
        if (imageKeys.length > i) break;
      }
    } catch (e) {
      console.error(`Image ${i+1} generation error:`, e.message);
      imageErrors.push(`img${i+1}: ${e.message}`);
    }
  }

  if (imageKeys.length === 0) {
    return json({ ok: false, error: "이미지 생성 실패 (0장)", details: imageErrors });
  }

  return json({ ok: true, image_keys: imageKeys, count: imageKeys.length });
}

// ============================================================
// API: 이미지 서빙 (교차배치용)
// ============================================================
async function apiServeImage(path, env) {
  const key = path.replace("/api/image/", "");
  if (!key) return json({ error: "no key" }, 400);
  const data = await env.KV.get(key);
  if (!data) return json({ error: "not found" }, 404);
  // base64 → binary
  const binary = Uint8Array.from(atob(data), c => c.charCodeAt(0));
  return new Response(binary, {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "public, max-age=86400",
      "Access-Control-Allow-Origin": "*"
    }
  });
}

/**
 * 이미지-글 교차 배치 HTML 생성
 * 이미지→글→이미지→글→이미지 패턴
 */
function buildInterleavedHTML(htmlBody, imageKeys, baseUrl) {
  if (!imageKeys || imageKeys.length === 0) return htmlBody;

  const imgTag = (key) => `<p><img src="${baseUrl}/api/image/${key}" style="max-width:100%"></p>`;

  // 본문을 <hr> 기준으로 섹션 분리
  const rawSections = htmlBody.split(/<hr\s*\/?>/i);
  const sections = rawSections.filter(s => s.trim().length > 0);

  if (sections.length <= 1) {
    // <hr> 없으면 소제목(font-size:16px) 기준 분리
    const lines = htmlBody.split("\n");
    const chunks = [];
    let chunk = "";
    for (const line of lines) {
      if (line.includes("font-size:16px") && chunk.trim()) {
        chunks.push(chunk.trim());
        chunk = "";
      }
      chunk += line + "\n";
    }
    if (chunk.trim()) chunks.push(chunk.trim());

    if (chunks.length > 1) {
      let result = "";
      let imgIdx = 0;
      for (let i = 0; i < chunks.length; i++) {
        if (imgIdx < imageKeys.length) {
          result += imgTag(imageKeys[imgIdx]) + "\n<br>\n";
          imgIdx++;
        }
        result += chunks[i] + "\n";
      }
      while (imgIdx < imageKeys.length) {
        result += "\n" + imgTag(imageKeys[imgIdx]);
        imgIdx++;
      }
      return result;
    }

    // 분리 불가 -> 이미지1 + 전체글 + 나머지이미지
    let result = imgTag(imageKeys[0]) + "\n<br>\n" + htmlBody;
    for (let i = 1; i < imageKeys.length; i++) {
      result += "\n<br>\n" + imgTag(imageKeys[i]);
    }
    return result;
  }

  // 섹션별 교차: 이미지->섹션->구분선->이미지->섹션->...
  let result = "";
  let imgIdx = 0;

  for (let i = 0; i < sections.length; i++) {
    if (imgIdx < imageKeys.length) {
      result += imgTag(imageKeys[imgIdx]) + "\n<br>\n";
      imgIdx++;
    }
    result += sections[i].trim() + "\n";
    if (i < sections.length - 1) {
      result += "<hr>\n";
    }
  }

  while (imgIdx < imageKeys.length) {
    result += "\n<br>\n" + imgTag(imageKeys[imgIdx]);
    imgIdx++;
  }

  return result;
}

/**
 * 이미지-글 교차배치 (data URI 방식)
 * 패턴: 이미지→글→이미지→글→이미지
 * content HTML을 섹션으로 분리 후 이미지 삽입
 */
function interleaveImagesDataURI(htmlContent, imageB64Arr) {
  if (!imageB64Arr || imageB64Arr.length === 0) return htmlContent;

  const imgTag = (b64) => `<p><img src="data:image/png;base64,${b64}" style="max-width:100%;margin:8px 0"></p>`;

  // 본문을 <hr> 기준으로 섹션 분리
  const rawSections = htmlContent.split(/<hr\s*\/?>/i);
  const sections = rawSections.filter(s => s.trim().length > 0);

  if (sections.length <= 1) {
    // hr 없으면 소제목(font-size:16px) 기준 분리
    const lines = htmlContent.split("\n");
    const chunks = [];
    let chunk = "";
    for (const line of lines) {
      if (line.includes("font-size:16px") && chunk.trim()) {
        chunks.push(chunk.trim());
        chunk = "";
      }
      chunk += line + "\n";
    }
    if (chunk.trim()) chunks.push(chunk.trim());

    if (chunks.length > 1) {
      let result = "";
      let imgIdx = 0;
      for (let i = 0; i < chunks.length; i++) {
        if (imgIdx < imageB64Arr.length) {
          result += imgTag(imageB64Arr[imgIdx]) + "\n";
          imgIdx++;
        }
        result += chunks[i] + "\n";
      }
      while (imgIdx < imageB64Arr.length) {
        result += imgTag(imageB64Arr[imgIdx]) + "\n";
        imgIdx++;
      }
      return result;
    }

    // 분리 불가 → 위1 + 본문 + 아래 나머지
    let result = imgTag(imageB64Arr[0]) + "\n" + htmlContent;
    for (let i = 1; i < imageB64Arr.length; i++) {
      result += "\n" + imgTag(imageB64Arr[i]);
    }
    return result;
  }

  // 섹션별 교차: 이미지→섹션→구분선→이미지→섹션→...
  let result = "";
  let imgIdx = 0;

  for (let i = 0; i < sections.length; i++) {
    if (imgIdx < imageB64Arr.length) {
      result += imgTag(imageB64Arr[imgIdx]) + "\n";
      imgIdx++;
    }
    result += sections[i].trim() + "\n";
    if (i < sections.length - 1) {
      result += "<hr>\n";
    }
  }

  // 남은 이미지
  while (imgIdx < imageB64Arr.length) {
    result += "\n" + imgTag(imageB64Arr[imgIdx]);
    imgIdx++;
  }

  return result;
}

// ============================================================
// API: 카페 발행 (CP949 + multipart/form-data + 해시태그)
// ============================================================
async function apiPublish(request, env) {
  const data = await request.json();
  const cfg = await kvGet(env, "config", {});

  if (!cfg.naver_access_token) {
    return json({ ok: false, error: "네이버 인증 필요 (설정에서 토큰 입력)" });
  }

  let subject = (data.title || "").replace(/[\uFFFD\u200B\u200C\u200D\uFEFF]/g, "");
  subject = subject.replace(/\*+/g, "").replace(/^[\s\-:]+|[\s\-:]+$/g, "").trim();
  let content = (data.body || "").replace(/[\uFFFD\u200B\u200C\u200D\uFEFF]/g, "");
  content = content.replace(/\*\*([^*]+)\*\*/g, "$1");
  // 발행 직전 스팸필터 안전망 (본문만 필터링)
  subject = applySpamFilterLight(subject);
  content = applySpamFilter(content);
  // ★ 프로필 + CTA + 면책 자동 래핑 (항상 적용)
  // CTA 링크(aurakim.com)가 없으면 아직 래핑 안 된 것
  if (!content.includes("aurakim.com")) {
    content = PROFILE_HTML + content + CTA_HTML + DISCLAIMER.replace(/\n/g, "<br>");
  }

  // 이미지 키
  const imageKeys = data.image_keys || (data.image_key ? [data.image_key] : []);

  if (!subject || !content) {
    return json({ ok: false, error: "제목/본문 필요" });
  }

  // 발행 제한 체크
  const history = await kvGet(env, "post_history", []);
  const today = new Date().toISOString().slice(0, 10);
  const todayCount = history.filter(h => h.timestamp?.startsWith(today)).length;
  const limit = cfg.daily_post_limit || 10;
  if (todayCount >= limit) {
    return json({ ok: false, error: `일일 한도 (${limit}건) 초과` });
  }

  try {
    const cafeId = cfg.naver_cafe_id;
    // ★ 카테고리 로테이션: 4(보험정보), 5(보험비교), 7(Q&A), 8(보험뉴스), 9(자유게시판)
    const ROTATING_MENUS = ["4", "5", "7", "18", "9"];
    let menuId = data.menu_id;
    if (!menuId) {
      // 이전 발행 이력에서 마지막 메뉴 확인 후 다음 메뉴
      const lastMenu = history.length > 0 ? (history[history.length - 1].menu_id || "4") : "4";
      const lastIdx = ROTATING_MENUS.indexOf(lastMenu);
      menuId = ROTATING_MENUS[(lastIdx + 1) % ROTATING_MENUS.length];
    }
    const apiUrl = `https://openapi.naver.com/v1/cafe/${cafeId}/menu/${menuId}/articles`;

    // 해시태그 추출
    const hashtags = data.hashtags || "";

    // ★ multipart/form-data + CP949 (이미지는 content 내 img src로 처리)
    const boundary = "----XIVIX" + Date.now();
    const encoder = new TextEncoder();
    const allParts = [];

    // subject (CP949)
    allParts.push(encoder.encode(`--${boundary}\r\nContent-Disposition: form-data; name="subject"\r\nContent-Type: text/plain; charset=euc-kr\r\n\r\n`));
    allParts.push(encodeCP949(subject));

    // content (CP949) - 이미지 <img src> 포함
    allParts.push(encoder.encode(`\r\n--${boundary}\r\nContent-Disposition: form-data; name="content"\r\nContent-Type: text/plain; charset=euc-kr\r\n\r\n`));
    allParts.push(encodeCP949(`<div>${content}</div>`));

    // tag (해시태그, CP949)
    if (hashtags) {
      allParts.push(encoder.encode(`\r\n--${boundary}\r\nContent-Disposition: form-data; name="tag"\r\nContent-Type: text/plain; charset=euc-kr\r\n\r\n`));
      allParts.push(encodeCP949(hashtags));
    }

    // ★ 공개설정: 전체공개 (openyn=true)
    allParts.push(encoder.encode(`\r\n--${boundary}\r\nContent-Disposition: form-data; name="openyn"\r\n\r\n`));
    allParts.push(encoder.encode("true"));

    // ★ 이미지 multipart 첨부
    // 네이버 API 구조: multipart image는 본문 상단에 자동 배치
    // data URI, 외부 img src 모두 네이버가 차단/무시하므로 multipart만 유효
    for (let i = 0; i < imageKeys.length; i++) {
      const imgData = await env.KV.get(imageKeys[i], { type: "text" });
      if (imgData) {
        allParts.push(encoder.encode(`\r\n--${boundary}\r\nContent-Disposition: form-data; name="image"; filename="image_${i}.png"\r\nContent-Type: image/png\r\n\r\n`));
        allParts.push(Uint8Array.from(atob(imgData), c => c.charCodeAt(0)));
      }
    }

    allParts.push(encoder.encode(`\r\n--${boundary}--\r\n`));

    const totalLen = allParts.reduce((s, a) => s + a.length, 0);
    const combined = new Uint8Array(totalLen);
    let offset = 0;
    for (const part of allParts) { combined.set(part, offset); offset += part.length; }

    const resp = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${cfg.naver_access_token}`,
        "Content-Type": `multipart/form-data; boundary=${boundary}`,
      },
      body: combined,
    });

    const result = await resp.json();

    history.push({
      timestamp: new Date().toISOString(),
      keyword: data.keyword || "",
      title: subject,
      menu_id: menuId,
      status: result.message?.status === "200" ? "success" : "fail",
      result,
    });
    await kvSet(env, "post_history", history.slice(-100));

    if (result.message?.status === "200") {
      return json({ ok: true, result });
    } else {
      return json({ ok: false, error: result.message?.error_message || "발행 실패", result });
    }
  } catch (e) {
    const h2 = await kvGet(env, "post_history", []);
    h2.push({ timestamp: new Date().toISOString(), keyword: data.keyword || "", title: subject, status: "fail" });
    await kvSet(env, "post_history", h2.slice(-100));
    return json({ ok: false, error: e.message });
  }
}

// ============================================================
// API: 자동 발행 (cron-job.org에서 호출)
// GET /api/auto-publish → 1건 자동 생성+발행
// ============================================================
async function apiAutoPublish(request, env, ctx) {
  const cfg = await kvGet(env, "config", {});

  // 토큰 자동 갱신
  if (cfg.naver_refresh_token && cfg.naver_client_id) {
    try {
      const tokenUrl = `https://nid.naver.com/oauth2.0/token?grant_type=refresh_token&client_id=${cfg.naver_client_id}&client_secret=${cfg.naver_client_secret}&refresh_token=${cfg.naver_refresh_token}`;
      const tokenResp = await fetch(tokenUrl);
      const tokenResult = await tokenResp.json();
      if (tokenResult.access_token) {
        cfg.naver_access_token = tokenResult.access_token;
        if (tokenResult.refresh_token) cfg.naver_refresh_token = tokenResult.refresh_token;
        await kvSet(env, "config", cfg);
      }
    } catch (e) { /* 토큰 갱신 실패해도 기존 토큰으로 시도 */ }
  }

  if (!cfg.naver_access_token) {
    return json({ ok: false, error: "네이버 인증 필요" });
  }

  // 일일 한도 체크
  const history = await kvGet(env, "post_history", []);
  const today = new Date().toISOString().slice(0, 10);
  const todayCount = history.filter(h => h.timestamp?.startsWith(today)).length;
  const limit = cfg.daily_post_limit || 10;
  if (todayCount >= limit) {
    return json({ ok: false, error: `일일 한도 (${limit}건) 도달`, today_count: todayCount });
  }

  // 카테고리 로테이션
  const ROTATING_MENUS = ["4", "5", "7", "18", "9"];
  const lastMenu = history.length > 0 ? (history[history.length - 1].menu_id || "4") : "9";
  const lastIdx = ROTATING_MENUS.indexOf(lastMenu);
  const menuId = ROTATING_MENUS[(lastIdx + 1) % ROTATING_MENUS.length];

  // ★ 즉시 응답 + 백그라운드 처리 (cron-job.org 타임아웃 방지)
  const doWork = async () => {
    try {
      const genReq = new Request(new URL("/api/generate", request.url).href, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ menu_id: menuId })
      });
      const genResp = await apiGenerate(genReq, env);
      const genData = await genResp.json();

      if (!genData.ok) {
        await kvSet(env, "auto_publish_last", { ok: false, error: "글 생성 실패", time: new Date().toISOString() });
        return;
      }

      const pubReq = new Request(new URL("/api/publish", request.url).href, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: genData.title,
          body: genData.html_body,
          keyword: genData.keyword,
          tags: genData.hashtags,
          hashtags: genData.hashtags,
          image_keys: genData.image_keys || [],
          menu_id: menuId,
        })
      });
      const pubResp = await apiPublish(pubReq, env);
      const pubData = await pubResp.json();
      const articleId = pubData.result?.message?.result?.articleId || "";

      await kvSet(env, "auto_publish_last", {
        ok: pubData.ok,
        article_id: articleId,
        url: articleId ? `https://cafe.naver.com/aurakim24/${articleId}` : "",
        menu_id: menuId,
        menu_name: CAFE_MENUS[menuId] || menuId,
        keyword: genData.keyword,
        title: genData.title,
        time: new Date().toISOString(),
      });
    } catch (e) {
      await kvSet(env, "auto_publish_last", { ok: false, error: e.message, time: new Date().toISOString() });
    }
  };

  // 백그라운드로 실행 (cron-job.org에 즉시 200 반환)
  ctx.waitUntil(doWork());

  return json({
    ok: true,
    status: "accepted",
    message: "백그라운드 발행 시작",
    menu_id: menuId,
    menu_name: CAFE_MENUS[menuId] || menuId,
    today_count: todayCount + 1,
    daily_limit: limit,
  });
}

// ============================================================
// API: 동기 자동 발행 (PC bat 파일용 - 완료될 때까지 기다림)
// GET /api/auto-publish-sync
// ============================================================
async function apiAutoPublishSync(request, env) {
  const cfg = await kvGet(env, "config", {});

  // 토큰 자동 갱신
  if (cfg.naver_refresh_token && cfg.naver_client_id) {
    try {
      const tokenUrl = `https://nid.naver.com/oauth2.0/token?grant_type=refresh_token&client_id=${cfg.naver_client_id}&client_secret=${cfg.naver_client_secret}&refresh_token=${cfg.naver_refresh_token}`;
      const tokenResp = await fetch(tokenUrl);
      const tokenResult = await tokenResp.json();
      if (tokenResult.access_token) {
        cfg.naver_access_token = tokenResult.access_token;
        if (tokenResult.refresh_token) cfg.naver_refresh_token = tokenResult.refresh_token;
        await kvSet(env, "config", cfg);
      }
    } catch (e) { /* */ }
  }

  if (!cfg.naver_access_token) {
    await sendTelegram(env, `🔑 <b>네이버 토큰 만료!</b>\n\n자동발행이 중단되었습니다.\n토큰 재발급이 필요합니다.\nhttps://cafe-auto-v2.pages.dev/api/oauth`);
    return json({ ok: false, error: "네이버 인증 필요" });
  }

  const history = await kvGet(env, "post_history", []);
  const today = new Date().toISOString().slice(0, 10);
  const todayCount = history.filter(h => h.timestamp?.startsWith(today)).length;
  const limit = cfg.daily_post_limit || 10;
  if (todayCount >= limit) return json({ ok: false, error: `일일 한도 (${limit}건) 도달`, today_count: todayCount });

  const ROTATING_MENUS = ["4", "5", "7", "18", "9"];
  const lastMenu = history.length > 0 ? (history[history.length - 1].menu_id || "4") : "9";
  const lastIdx = ROTATING_MENUS.indexOf(lastMenu);
  const menuId = ROTATING_MENUS[(lastIdx + 1) % ROTATING_MENUS.length];

  try {
    const genReq = new Request(new URL("/api/generate", request.url).href, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ menu_id: menuId })
    });
    const genResp = await apiGenerate(genReq, env);
    const genData = await genResp.json();
    if (!genData.ok) return json({ ok: false, error: "글 생성 실패", step: "generate" });

    const pubReq = new Request(new URL("/api/publish", request.url).href, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: genData.title, body: genData.html_body, keyword: genData.keyword,
        tags: genData.hashtags, hashtags: genData.hashtags,
        image_keys: genData.image_keys || [], menu_id: menuId,
      })
    });
    const pubResp = await apiPublish(pubReq, env);
    const pubData = await pubResp.json();
    const articleId = pubData.result?.message?.result?.articleId || "";

    // ★ 텔레그램 알림 (성공)
    const cafeUrl = articleId ? `https://cafe.naver.com/aurakim24/${articleId}` : "";
    await sendTelegram(env, `${pubData.ok ? "✅" : "❌"} <b>카페 발행 ${pubData.ok ? "성공" : "실패"}</b>\n\n📌 ${genData.keyword} | ${CAFE_MENUS[menuId] || menuId}\n📝 ${genData.title}\n🖼 이미지: ${genData.image_source || "none"}\n📊 오늘 ${todayCount + 1}/${limit}건${cafeUrl ? "\n🔗 " + cafeUrl : ""}`);

    return json({
      ok: pubData.ok, article_id: articleId,
      url: cafeUrl,
      menu_id: menuId, menu_name: CAFE_MENUS[menuId] || menuId,
      keyword: genData.keyword, title: genData.title,
      image_count: (genData.image_keys || []).length,
      image_source: genData.image_source || "unknown",
      today_count: todayCount + 1, daily_limit: limit,
    });
  } catch (e) {
    // ★ 텔레그램 알림 (실패)
    await sendTelegram(env, `❌ <b>카페 발행 오류</b>\n\n${e.message}`);
    return json({ ok: false, error: e.message });
  }
}

// ============================================================
// API: 금소법 검사
// ============================================================
async function apiCompliance(request) {
  const data = await request.json();
  const text = data.text || "";
  const found = BANNED_WORDS.filter(w => text.includes(w));
  return json({ ok: found.length === 0, filtered_words: found });
}

// ============================================================
// API: 발행 이력
// ============================================================
// ============================================================
// API: 이미지 사용량 통계
// ============================================================
async function apiImageStats(env) {
  const limit = await checkImageDailyLimit(env);
  return json({
    ok: true,
    date: new Date().toISOString().slice(0, 10),
    model: IMAGE_MODEL,
    today_count: limit.count,
    daily_limit: IMAGE_DAILY_LIMIT,
    remaining: limit.remaining,
    estimated_cost_today: `$${(limit.count * 0.039).toFixed(2)}`,
  });
}

// ============================================================
// API: 발행 이력
// ============================================================
async function apiHistory(env) {
  const history = await kvGet(env, "post_history", []);
  return json({ posts: history });
}

// ============================================================
// API: 네이버 토큰 갱신
// ============================================================
// ============================================================
// API: OAuth 인증 시작 → 네이버 로그인 페이지로 리다이렉트
// ============================================================
async function apiOAuthStart(env) {
  const cfg = await kvGet(env, "config", {});
  if (!cfg.naver_client_id) {
    return json({ ok: false, error: "naver_client_id 미설정" });
  }
  const redirectUri = "https://cafe-auto-v2.pages.dev/api/oauth-callback";
  const url = `https://nid.naver.com/oauth2.0/authorize?response_type=code&client_id=${cfg.naver_client_id}&redirect_uri=${encodeURIComponent(redirectUri)}&state=cafe_auth`;
  return Response.redirect(url, 302);
}

// ============================================================
// API: OAuth 콜백 → code를 token으로 교환 후 KV 저장
// ============================================================
async function apiOAuthCallback(request, env) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const error = url.searchParams.get("error");

  if (error || !code) {
    return new Response(`<html><body style="font-family:sans-serif;text-align:center;padding:60px;">
      <h2 style="color:red;">인증 실패</h2>
      <p>${error || "code 없음"}</p>
      <a href="/api/oauth">다시 시도</a>
    </body></html>`, { headers: { "Content-Type": "text/html; charset=utf-8" } });
  }

  const cfg = await kvGet(env, "config", {});
  const redirectUri = "https://cafe-auto-v2.pages.dev/api/oauth-callback";
  const tokenUrl = `https://nid.naver.com/oauth2.0/token?grant_type=authorization_code&client_id=${cfg.naver_client_id}&client_secret=${cfg.naver_client_secret}&code=${code}&redirect_uri=${encodeURIComponent(redirectUri)}`;

  try {
    const resp = await fetch(tokenUrl);
    const result = await resp.json();

    if (result.access_token) {
      cfg.naver_access_token = result.access_token;
      if (result.refresh_token) cfg.naver_refresh_token = result.refresh_token;
      await kvSet(env, "config", cfg);

      return new Response(`<html><body style="font-family:sans-serif;text-align:center;padding:60px;">
        <h2 style="color:green;">인증 성공!</h2>
        <p>access_token, refresh_token 저장 완료</p>
        <p style="color:#666;margin-top:20px;">이 창을 닫으셔도 됩니다.</p>
        <a href="/" style="display:inline-block;margin-top:20px;padding:12px 24px;background:#2563eb;color:white;border-radius:8px;text-decoration:none;">대시보드로 이동</a>
      </body></html>`, { headers: { "Content-Type": "text/html; charset=utf-8" } });
    } else {
      return new Response(`<html><body style="font-family:sans-serif;text-align:center;padding:60px;">
        <h2 style="color:red;">토큰 교환 실패</h2>
        <p>${result.error_description || JSON.stringify(result)}</p>
        <a href="/api/oauth">다시 시도</a>
      </body></html>`, { headers: { "Content-Type": "text/html; charset=utf-8" } });
    }
  } catch (e) {
    return new Response(`<html><body><h2>오류</h2><p>${e.message}</p></body></html>`,
      { headers: { "Content-Type": "text/html; charset=utf-8" } });
  }
}

// ============================================================
// API: code → token 교환 (GET /api/exchange-code?code=XXX)
// ============================================================
async function apiExchangeCode(request, env) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const redirectUri = url.searchParams.get("redirect_uri") || "https://developers.naver.com/popup/nid";
  if (!code) return json({ ok: false, error: "code 필요" });

  const cfg = await kvGet(env, "config", {});
  const tokenUrl = `https://nid.naver.com/oauth2.0/token?grant_type=authorization_code&client_id=${cfg.naver_client_id}&client_secret=${cfg.naver_client_secret}&code=${code}&redirect_uri=${encodeURIComponent(redirectUri)}`;

  try {
    const resp = await fetch(tokenUrl);
    const result = await resp.json();
    if (result.access_token) {
      cfg.naver_access_token = result.access_token;
      if (result.refresh_token) cfg.naver_refresh_token = result.refresh_token;
      await kvSet(env, "config", cfg);
      return json({ ok: true, message: "토큰 저장 완료", has_refresh: !!result.refresh_token });
    }
    return json({ ok: false, error: result.error_description || result.error, result });
  } catch (e) {
    return json({ ok: false, error: e.message });
  }
}

// ============================================================
// API: 네이버 토큰 갱신
// ============================================================
async function apiRefreshToken(env) {
  const cfg = await kvGet(env, "config", {});
  if (!cfg.naver_client_id || !cfg.naver_client_secret || !cfg.naver_refresh_token) {
    return json({ ok: false, error: "refresh_token 또는 client 정보 없음" });
  }
  try {
    const url = `https://nid.naver.com/oauth2.0/token?grant_type=refresh_token&client_id=${cfg.naver_client_id}&client_secret=${cfg.naver_client_secret}&refresh_token=${cfg.naver_refresh_token}`;
    const resp = await fetch(url);
    const result = await resp.json();
    if (result.access_token) {
      cfg.naver_access_token = result.access_token;
      if (result.refresh_token) cfg.naver_refresh_token = result.refresh_token;
      await kvSet(env, "config", cfg);
      return json({ ok: true, message: "토큰 갱신 완료", token_prefix: result.access_token.slice(0, 15) + "..." });
    }
    return json({ ok: false, error: result.error_description || "갱신 실패", result });
  } catch (e) {
    return json({ ok: false, error: e.message });
  }
}

// ============================================================
// DEBUG: 인코딩 테스트 발행
// ============================================================
async function apiPublishTest(request, env) {
  const cfg = await kvGet(env, "config", {});
  if (!cfg.naver_access_token) {
    return json({ ok: false, error: "네이버 인증 필요" });
  }

  const cafeId = cfg.naver_cafe_id;
  const menuId = cfg.naver_menu_id || "4";
  const apiUrl = `https://openapi.naver.com/v1/cafe/${cafeId}/menu/${menuId}/articles`;
  const testBody = "안녕하세요. 15년차 현직 설계사입니다. 실손보험 갱신 시 반드시 확인하세요.";
  const results = [];

  // Test 1: CP949 URL인코딩 (현재 방식)
  try {
    const form1 = `subject=${cp949UrlEncode("인코딩테스트1 CP949")}&content=${cp949UrlEncode("<div>" + testBody + "</div>")}`;
    const r1 = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${cfg.naver_access_token}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: form1,
    });
    const d1 = await r1.json();
    results.push({ test: "CP949_urlencode", articleId: d1.message?.result?.articleId, status: d1.message?.status });
  } catch(e) { results.push({ test: "CP949_urlencode", error: e.message }); }

  // Test 2: CP949 + charset=euc-kr 헤더
  try {
    const form2 = `subject=${cp949UrlEncode("인코딩테스트2 CP949+charset")}&content=${cp949UrlEncode("<div>" + testBody + "</div>")}`;
    const r2 = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${cfg.naver_access_token}`,
        "Content-Type": "application/x-www-form-urlencoded; charset=euc-kr",
      },
      body: form2,
    });
    const d2 = await r2.json();
    results.push({ test: "CP949_charset_euckr", articleId: d2.message?.result?.articleId, status: d2.message?.status });
  } catch(e) { results.push({ test: "CP949_charset_euckr", error: e.message }); }

  // Test 3: UTF-8 URLSearchParams (기본)
  try {
    const params3 = new URLSearchParams();
    params3.set("subject", "인코딩테스트3 UTF8");
    params3.set("content", "<div>" + testBody + "</div>");
    const r3 = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${cfg.naver_access_token}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params3.toString(),
    });
    const d3 = await r3.json();
    results.push({ test: "UTF8_urlsearchparams", articleId: d3.message?.result?.articleId, status: d3.message?.status });
  } catch(e) { results.push({ test: "UTF8_urlsearchparams", error: e.message }); }

  // Test 4: UTF-8 + charset=utf-8 헤더
  try {
    const params4 = new URLSearchParams();
    params4.set("subject", "인코딩테스트4 UTF8+charset");
    params4.set("content", "<div>" + testBody + "</div>");
    const r4 = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${cfg.naver_access_token}`,
        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
      },
      body: params4.toString(),
    });
    const d4 = await r4.json();
    results.push({ test: "UTF8_charset_utf8", articleId: d4.message?.result?.articleId, status: d4.message?.status });
  } catch(e) { results.push({ test: "UTF8_charset_utf8", error: e.message }); }

  return json({ ok: true, results });
}
