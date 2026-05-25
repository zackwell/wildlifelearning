import * as baidu from "../src/lib/species-baidu-baike.ts";
import * as wiki from "../src/lib/species-wiki-anchor.ts";

const q = "珍珠鸡";
const species = await baidu.resolveBaiduBaikeSpecies(q);
console.log(
  JSON.stringify(
    {
      baidu: species
        ? {
            title: species.title,
            scientificName: species.scientificName,
            officialChineseName: species.officialChineseName,
            refLen: species.referenceBody.length,
            rich: baidu.baiduReferenceIsRich(species.referenceBody),
            summaryLen: species.summary.length,
          }
        : null,
    },
    null,
    2,
  ),
);

const anchor = await wiki.resolveSpeciesWikiAnchor(q);
console.log(
  JSON.stringify(
    {
      anchor: {
        contentSource: anchor.contentSource,
        zhTitle: anchor.zhTitle,
        canonicalDisplayName: anchor.canonicalDisplayName,
        scientificNameHint: anchor.scientificNameHint,
        refLen: anchor.referenceBody?.length ?? 0,
        rich: anchor.referenceBody
          ? baidu.baiduReferenceIsRich(anchor.referenceBody)
          : false,
      },
    },
    null,
    2,
  ),
);
