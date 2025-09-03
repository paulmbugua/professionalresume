// apps/web/src/utils/subjectImages.ts
import type { Course } from '@mytutorapp/shared/types'

/** --------------------------------------------------------
 * Canonical subjects → images
 * ------------------------------------------------------- */
export const SUBJECT_IMAGE_MAP: Record<string, string> = {
  'mathematics': 'https://lh3.googleusercontent.com/aida-public/AB6AXuArQ8nhWTn2okvVCCirH4UbQH41aue4bkzBkbsdXOStRVddPLGjMq2lg-iygCTNGqrnUgq2MP1YO3Aw4KQUbVrN5pfxtrjNtC5o1kC4Tuba62f0pLTn3YspVtxO1QGnTj6PI7I5iIs3_Qgw8pDcvK13CwX8s8YYRKm7JmexSEJjzCP5f_kcMBBLVEM8XWfDYZ5GQxnRvuNjL4g363LH0DVxkZy_ET_0foTUHlCsOthl2tu80DInSUv65dZUVOyAL_IeCRj5vN3wDt0',
  'science': 'https://lh3.googleusercontent.com/aida-public/AB6AXuDCxsF3NWeAGHus2HulU0lOsPl5h12KA5pyvXUKOKV0XWMvVqUOtwull9H2XBrYCNBHWBN_NdX8yTg2sh7mV0K2Jek9uxkgGxI0Ebo8Ndv5vbULulu-0WbSIH09Ph_HJsgbq2mUyKl5sdD1zxNsLgS-0_CJd8GIcl9uurYwNWn7aiB3I6eX903xhu4x2YQmTtMp-LMpNwNw1NQfg4BUn2Lt9Der_2sQPbyYqQsM5nF0YROs8d8UsGYBUUHe3UokS9zXGhc1emsqOuw',
  'english': 'https://lh3.googleusercontent.com/aida-public/AB6AXuAps3FAm82gW8udYqRcZK21oWFNx2mZk010tOWH-0ukd23mg4OYnUnesoZmUViRikoIUGkusae_pCifu7-dUkeOTNoH7yprxBlf1m4XGmTIi2nz8w32dGhLV3stnTpKGwckR0MHg6R-uhYR5rtK5tvSEVQqYrq3IZ2WbWpAmQqlo3FYThRYklu_hZhzYL7eUQrwgwVWebruR2Rk9k8S7MrL0lrVJvwJGw_MH0CBfW5fH_BQEs7JHIJimtDU0MjHSHdDvXJv4Ip-bM8',
  'history': 'https://lh3.googleusercontent.com/aida-public/AB6AXuA-YHR2tJELu6dDqz33ps9Efxej-XpX86z6lf-H6qdqEKP8OKQqMxixnXwlcW1MAU2HS6m2eiyp6-sZ7kIVMm5cT2txxNfZaiajFHhSTy9q8H1dYBb7caV9s_QFMEDban0tnlcxaW0el6d74UlNd3Iz4O1IWELqh6xrsdJol7MFNF3SAL_pbcl7ngrmxerhk3BvY8wUmpiufeAZTOPCkSO8OkifdW17AKi0Ha8TFMANshfB5IsUJbJfjBvwbd5J5X0ka9ydtRKOTlM',
  'computer science': 'https://lh3.googleusercontent.com/aida-public/AB6AXuD7zc1erVhF-pdiqxal89vYc2ZYGdFwiC_eHIgnkPmAgv6g2tlBM32J8s5Ig_bzTG50latXva_gZd0v26VubI186lTN2pWbfkRLTWiazgK1n-ocE8oxHZg9fwN4901ilu7A6FEo-8CDZUvuYpnggmFr_1z9KDOuI5XrZz8OeIEBdJ71ZXiHuz7TqmOOau7sykQIkdjlm01lrpdw41FDMFxS_lWaVqwR6pM3K0Pp-aElQZBNq-BlfqgUR13Z0hBooJ2z3nVvx4cQnQE',
  'foreign languages': 'https://lh3.googleusercontent.com/aida-public/AB6AXuD8-tbCZT3bPy3YUQ-vhb_8hJFoMyS6kZSg3iWvOmaDg-nfo28AFs5vFlZJe8aaECP94W57U14UZrtiJY13G4LiJQ_ng-Xz9M0ivrRqiae-_u6BkotWFyW5F43ELnTOcKRIY_FoLxH8r-f7hV_AFsc2T41gix-si4yx3GjB2iwqJaVRl1QUzQndjo2ydRKJoFyYFPl_0Y0fpAjN45czOKNviPAHFVo6P0Si4dCqukxkJGxFnuFZQAALgan7KPy9u18DfY_zNQGbXWg',
  'arts': 'https://lh3.googleusercontent.com/aida-public/AB6AXuDnVytQiaMvFeaqGqFb121Z3wjhYbTJxujUQnE_nzSXBQJ84Lai-VKDukNMPgAf-3BuRHCpd_AzVbjGtS8c31U0JWgh-Q96mJzN61fqXhUQS9GYEasCVlvIQcJ-EMQJCO-eqzXJZiwb1daoxfe7-55YVHSi4hQ0znokDqwwzh5udyzzHAWIuJC-BDw2a4F-MFSN4YyQLtmMFkE-nPDop551079fsoL4JlbsD5SmQCyjLvrgDdj9tn-gh77dCbH8NDXOzQsfJP8fYn0',
  'social studies': 'https://lh3.googleusercontent.com/aida-public/AB6AXuCMTBhiWjHOx6Edd8fdULVDwMg6mEHcvtlV0wyL59QQH2YcoD0B0V5kVVzdVIzuupJeZXd5BuoIA2HsVdpSvekYaPZvJRPKGjTrJnTAcFVqEfhMbDJp62DD6uccWebFuFhxIukYoj-zLAzraIN8kMNykKQTC8i2NlJ5iTJEQMtJvYLdRF3lZGot8RS51Qjr1qz18y_XoM_OMcD_YcqNZfIRf-tf1XukJFSojBkj1pblGkPw-kFiid_QnX8X8ZRs1a2oeEYOKQ_IEMg',
  'business': 'https://lh3.googleusercontent.com/aida-public/AB6AXuBiP4zUKuy13X91XlG58hWmkQyVoI7aKpA0B6LjnBfVMmhGjxCexioEJSXgABlYBM5L7WtHY2gl1b20SotQqh-GRy_OyTQ5DL_-cvHWWg3J5wlt9rjjb7iEbR8KXVcaUIG18Grv_Mxz76ImUCSII4sUVRtPvZgE6nYb1CGRoxuj0K9_KJ_qEFKgAI0CQpCKHx8RKDTCTTOuK7BmSUYimKK22FB-MEXVB3kY131A-i1FsuUIjrdRMh_HAVcz-NEo8WnYpz2OU8IeNec',
  'engineering': 'https://lh3.googleusercontent.com/aida-public/AB6AXuAwINsG5rpZGfCBG1qycJ8qe664npfy9vjX_jklqbkzhyI__3CLU2_jOodKHqIfGP-gclJuKeLGOczFMIGNit9XRsMx5dfAl0B43IvgsIIhHD3IZxYVXT-hXWlQpk4X76V0VAnbhGHK2gbBjhV1LmMfgpjqp_rfzhbXv9OPGeP4dYWcQhuYnDgMgq85gGVR3eBmrxAtCLQa76FcDMzvPy_6WBxlO4lDZWhjjRnTa3i0_UeOIrbjY3HOJnpRIEvXYiMwf4dKl13GdmU',
  'law': 'https://lh3.googleusercontent.com/aida-public/AB6AXuBJYNchEv-9hrJW0NAoszNIRPogRvfgV1vDUxzSDF02hnSvKQTifFpG1HDasCxPCUPVpGhQ6tkBMXqN7iUTGBTo71sl3UKF7aMSb-q0MtEK-XHeeB1IC-xP8krG-owqhBf-MTdDjt7yOE7ZO8_9-kNL5PtItiyiQBJcNeuqaO9O-kqSswOPHrWRx8ejrkC0GfM624UwjhZWaLF1WMbRnZjRjFxrhaMutZJtYj9cIa4DpFBaqWnf1DQNW2q6EYIdYpB9pGpqg3OAIHk',
  'medicine': 'https://lh3.googleusercontent.com/aida-public/AB6AXuAxBriO-lFQXu3br7pIE9fxt5cDN2NnJ0Dm2m1_epPWSeWJpcBn0cU-hPM56Q17ATKzeO1a7XT7orIFy4IvpVRUl8zSO6ft1GwrTm7KqXvuFJoVDy8yCCHBtLulG1BhLU-S60DVYODAsuRmmmU19iEg6Oq2J9GR0aeKK-WCkOGEqZ-6duM6_EavHyEswXYsJ8CPMw1CaPxwqpG0wVz6nCgjvzZQsBJQiqZpyKIGzA9vxYZGz8-RJfsuHwE0FiwXuqUJ4ejNEvpjycQ',
  'music': 'https://lh3.googleusercontent.com/aida-public/AB6AXuALGy19vI2lzoPPIhYCOKDc8OrN57brwun5FWh6Z1slmxYnFsKUI1yDYxR2fDu4hIrFr2jVNDgnabPRu997LWzoHcYcPfc22H-7hWmW0QgAlT0327s1IPSwfjHT8hDvccrNrw7B2HkG7l8keAD-oFWiEO2b46nw86VNYClP6iQ71GLR427LnvxiEqtl19iXrpOyfdo0lz2ncaWdEwgPHqsrcxqJ0F8cQli4rAHsjYHEuGIT0rH6zeNvtMdgOlUER51JLfbsjOXcNuo',
  'philosophy': 'https://lh3.googleusercontent.com/aida-public/AB6AXuCMTBhiWjHOx6Edd8fdULVDwMg6mEHcvtlV0wyL59QQH2YcoD0B0V5kVVzdVIzuupJeZXd5BuoIA2HsVdpSvekYaPZvJRPKGjTrJnTAcFVqEfhMbDJp62DD6uccWebFuFhxIukYoj-zLAzraIN8kMNykKQTC8i2NlJ5iTJEQMtJvYLdRF3lZGot8RS51Qjr1qz18y_XoM_OMcD_YcqNZfIRf-tf1XukJFSojBkj1pblGkPw-kFiid_QnX8X8ZRs1a2oeEYOKQ_IEMg',
  'psychology': 'https://lh3.googleusercontent.com/aida-public/AB6AXuCPS3LT7Eli3K5j5GQj81m8f30eLZdjz00NSjy2D8qBUiVZ1_SkwtSkLwbQLfhM7qfEgoIaqVn_k8oDkJSpCg0mqYK_GeU-ACA2LoiVfJBQkRgD6EcpvkvqNLpI-bRiL8Oj787I6hF6pJPxvrtLt2nVpFGPGUs7ME7L1z6m3ydDQE6ciGCmM-HsuHsstMwiIxua1bw6kw5uR0MOB0efRtTmxaN3kwYjUUB6Xs4l4BMQARg8dTm92oLAQzMCmODuWkWFZ4dCx7zBLts',
  'sociology': 'https://lh3.googleusercontent.com/aida-public/AB6AXuCLZ40EaXYIMuN1C5bzX6CIPpQo8h5ebnY0XTSVbBxv3PF1C-NLk3Nufe522-xXVc6OMYg24s9CJb9yFc956WsZEgscuQYhdgsYRZlog1LulXd55oPJLIjWpV7k2fc3ETZibBKDxGtq7rywpso9XOZPqQIF1SuihcNnqRPydhde7u4p0dA_W0pjRFC8IgFT4dqPvnYw1CXW9LIWrVpNbJeKZ9Vtx5p7obG6ca5h51y_qvbMNMqjYCnmH2Lt6PszMvNxFee-mQSQOww',
  'economics': 'https://lh3.googleusercontent.com/aida-public/AB6AXuCUQEu0pzrE-5Ou54m5i_kg1DZ_H02AuXcLUVcjBa_WEwrucz_klsrbsSjvMtYUiCz_SmoilJJNTsyxDIj9EJn11kCs5MIYkN1ZZY0W4_7P6-HGF24WE9Q0WMARfL81VbJa5eIxbkavoIxkzK7wpphKx8yk6GLMa-nTiwIp8w5qo_qgmwfF1iinkBpMHFE_HgdijaLFdUknL5M73Q2o01zuewX0UkKD-ry9I8KWLK7sZzaAqC_ZSHfYXVICNGbZZVk_NoHpfDzq6iY',
  'biology': 'https://lh3.googleusercontent.com/aida-public/AB6AXuAsBEB8ZzxSFMYP1CXL0eBxRVaHfoVREjDUbKfyrBEKbKLICjClL0h-uCHVIgNsvOgRGFs8OHrsng493NWeLbEA8OGDB6Ee8tWI-TbvZ-JtA_woH5V-pt0Ed2tJqoQcNAtsGcqRXACGhD50X16PaVMhI97bFZRQULDV-Ku8Z9sUTRu5aCUU5qTqhkZnZDY8j0Q-gtGioO2Nnz289RD6UU6aKSLuNKtln0T6Eq8KRqfLTSbxU_BMh2xHzw_607SAtIUwHqlBksYsk-4',
  'chemistry': 'https://lh3.googleusercontent.com/aida-public/AB6AXuBI70hG6enqFYNH25fkDzv1QRrutcRFaFbZjbaoAzyWgVUN8UVBHbZVlq7cl_cbne3MmziosjlZuz5K4Bv_vIKTG5GO6vkWMl3bgzxfcDofnMqI4wZMUCtcKKnRb0cDr3SIezaIDO4hRegiQCuW8lwDvhek7tP0rNe2ts8F2yc6-ct41rNUZdUll7Ye3oRbh5jI_QVaOVZJ0oTKjqzNg-IdJfOgk4oJ7jZAYkIoTaBwt6cgz0qu3p_WEAU1iSTIvS5nMYMibxoBP4w',
  'physics': 'https://lh3.googleusercontent.com/aida-public/AB6AXuCQO9vH00wDUKZB0dS11UWL7sP0kR7wn_dzd5GQ0ooUsTq7ECuvx59uERM4V-6K7pjxxssSV3KhcW2QZAT8x_hvyDgAuHLlxQ_4dR_BFTDOTx3LDuv6U0wN5RBSmZqxENf7NWtTQ6qWgy2Me1rcgJnNbik-7MnMQo10HARWEg0SU6GQUcV9rcZyj4xqBReXIjHmk0GyudFi9gkuDNdqEzWUjiGFMoeUTpp07wC74ZXELDg0JJ1GFiaMRSOKa9nS4KZ_7CF1tRSy2XU',
  'finance': 'https://lh3.googleusercontent.com/aida-public/AB6AXuCrGmInfP9NOZJp5tDCaUUxUlQNLqiTwJ1o1PBq1gAjMvgWc4T6ow2viUS1VGnHbcyXTo-IAY2SggAvHnOqorCEwYroYKzeCqfMlw20TQqE5kXepY-JXIOneQtf940B3yrpGsCbFDOGxEdfewrrqwhqYQkJQmS8srbJ4S0g1tQWlaMedKB9H-q8Y3SYAGuRVdj0SFsK4sEyxk24vtxozy4NYdlGsz78leDm3RNgRtL80pqGkKwu0BHXyB4qFgBssThB3Oh_ayhzNvQ',
  // Dedicated canonicals
  'statistics': 'https://images.unsplash.com/photo-1551281044-8c5f6f40aa4e?q=80&w=1400&auto=format&fit=crop',
  'deep learning': 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=1400&auto=format&fit=crop',
}

export const FALLBACK_COURSE_IMAGE =
  'https://images.unsplash.com/photo-1496307042754-b4aa456c4a2d?q=80&w=1400&auto=format&fit=crop'

/** --------------------------------------------------------
 * Aliases → canonical subjects
 * ------------------------------------------------------- */
export const SUBJECT_ALIASES: Record<string, string[]> = {
  'mathematics': [
    'math','algebra','linear algebra','fractions','decimals',
    'calculus','discrete math','combinatorics','graphs','equations','functions','pca',
    'quant','optimization'
  ],

  'statistics': [
    'statistics','statistical','probability','hypothesis test','hypothesis testing',
    'p-values','p value','confidence interval','ab testing','a/b testing','a b testing',
    'time series','forecasting','econometrics','regression','anova',
    'data analysis','pandas','dataframe','data frames',
    'data visualization','visualization','matplotlib',
    'charts','plots','dashboard','dashboards',
    'business analytics','kpis','kpi'
  ],

  'deep learning': [
    'deep learning','neural network','neural networks','cnn','rnn','lstm',
    'transformer','attention','pytorch','keras','autoencoder','gpt'
  ],

  'computer science': [
    'data structures','algorithms','time complexity','python','javascript','typescript',
    'react','node','graphql','sql','docker','kubernetes','cloud fundamentals','git',
    'ml','machine learning',
    'computer vision','nlp','rag','prompt engineering'
  ],

  'physics': ['mechanics','motion','forces','thermodynamics','optics','electricity','magnetism'],
  'chemistry': ['stoichiometry','periodic table','reactions','equilibrium'],
  'biology': ['cells','genetics','evolution'],

  'english': [
    'literature','writing','composition','reading','grammar',
    'public speaking','presentation','presentations','writing skills','communication'
  ],

  'arts': ['art','drawing','painting','design','ui/ux','ux','ui','wireframes','prototyping'],

  'foreign languages': ['german a1','kiswahili','vocabulary','french','spanish'],

  'business': ['marketing','seo','social media','product management','project management','entrepreneurship'],

  'finance': ['accounting','personal finance','corporate finance'],

  'economics': ['microeconomics','macroeconomics'],
}

/** --------------------------------------------------------
 * Priority so fine-grained buckets win over broad categories
 * ------------------------------------------------------- */
export const SUBJECT_PRIORITY = [
  'deep learning',
  'statistics',
  'computer science',
  'mathematics',
  'physics',
  'chemistry',
  'biology',
  'economics',
  'finance',
  'english',
  'foreign languages',
  'arts',
  'business',
]

/** --------------------------------------------------------
 * Utilities
 * ------------------------------------------------------- */
const resolveBackendPath = (url: string | undefined, backendUrl?: string) => {
  if (!url) return ''
  if (url.startsWith('/')) return (backendUrl ?? '').replace(/\/+$/, '') + url
  return url
}

// Accept a looser course shape so TS is happy and we can read subject/category safely.
type CourseLoose = Partial<Course> & {
  subject?: string
  category?: string
  image?: string
  thumbnail_url?: string
  thumb?: string
  description?: string
  title?: string
  level?: string
}

/** --------------------------------------------------------
 * Main picker
 * ------------------------------------------------------- */
export function pickImageForCourse(c: CourseLoose, backendUrl?: string): string {
  // 1) Prefer an explicit image provided by the API/course object
  const direct = resolveBackendPath(c.image || c.thumbnail_url || c.thumb, backendUrl)
  if (direct) return direct

  // 2) Build a searchable "haystack" from common text fields
  const hay = [
    c.subject,
    c.category,
    c.level,
    c.title,
    c.description,
  ].filter(Boolean).join(' ').toLowerCase()

  // 3) Priority-based matching against canonicals and aliases
  for (const key of SUBJECT_PRIORITY) {
    if (!SUBJECT_IMAGE_MAP[key]) continue
    const aliases = SUBJECT_ALIASES[key] || []
    if (hay.includes(key) || aliases.some(a => hay.includes(a))) {
      return SUBJECT_IMAGE_MAP[key]
    }
  }

  // 4) Last chance: scan all canonicals (in case you add ones not in PRIORITY)
  for (const key of Object.keys(SUBJECT_IMAGE_MAP)) {
    if (hay.includes(key)) return SUBJECT_IMAGE_MAP[key]
  }
  for (const [canonical, aliases] of Object.entries(SUBJECT_ALIASES)) {
    if (aliases.some(a => hay.includes(a))) return SUBJECT_IMAGE_MAP[canonical]
  }

  // 5) Fallback
  return FALLBACK_COURSE_IMAGE
}
